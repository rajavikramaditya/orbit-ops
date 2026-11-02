import { describe, expect, it } from "vitest";
import {
  amountInWordsINR,
  calculateCycleProgress,
  calculateInvoiceTotalsPaise,
  calculatePriorityScore,
  checkSpellingGuard,
  evaluateClientHealth,
  formatDateDDMMYYYY,
  formatDocumentNumber,
  formatPaiseToINR,
  getClientCycleWindow,
  isRequestOverdueForTriage,
} from "../business-rules";
import { ContentItem } from "../types";

describe("Orbit Ops — Section 8 Business Rules Suite", () => {
  describe("1. Retainer Cycle Window (billing day based, not calendar month)", () => {
    it("computes cycle starting on billing day 12th when today is after the 12th", () => {
      const window = getClientCycleWindow(12, "2026-10-24");
      expect(window.cycleStart).toBe("2026-10-12");
      expect(window.cycleEnd).toBe("2026-11-11");
      expect(window.daysInCycle).toBe(31);
      expect(window.daysElapsed).toBe(13); // Oct 12 through Oct 24 inclusive
    });

    it("computes cycle starting in previous month when today is before billing day 12th", () => {
      const window = getClientCycleWindow(12, "2026-10-08");
      expect(window.cycleStart).toBe("2026-09-12");
      expect(window.cycleEnd).toBe("2026-10-11");
      expect(window.daysInCycle).toBe(30);
    });
  });

  describe("2. Behind Schedule & Cycle Progress Calculation", () => {
    const baseItem = (overrides: Partial<ContentItem>): ContentItem => ({
      id: "item-1",
      clientId: "c-1",
      type: "reel",
      title: "Test Reel",
      referenceLinks: [],
      stage: "idea",
      stageChangedAt: "2026-10-15T10:00:00Z",
      assigneeId: "u-1",
      platforms: ["Instagram"],
      revisionCount: 0,
      createdAt: "2026-10-12T10:00:00Z",
      updatedAt: "2026-10-15T10:00:00Z",
      ...overrides,
    });

    it("marks client as behind schedule when posted + approved/scheduled is > 1 below expected_by_today", () => {
      // Cycle starts on 1st Oct 2026 (31 days). On Oct 16 (16 days elapsed),
      // For a 12-video package: expected = 12 * (16 / 31) = 6.19 videos.
      // If only 2 videos are posted and 1 is scheduled (total 3), deficit = 3.19 (> 1) -> Behind!
      const items: ContentItem[] = [
        baseItem({ id: "1", stage: "posted", postedAt: "2026-10-04T10:00:00Z" }),
        baseItem({ id: "2", stage: "posted", postedAt: "2026-10-09T10:00:00Z" }),
        baseItem({ id: "3", stage: "scheduled", postOn: "2026-10-17" }),
      ];

      const progress = calculateCycleProgress(
        { cycleDay: 1, videosPerCycle: 12 },
        items,
        "2026-10-16"
      );

      expect(progress.postedCount).toBe(2);
      expect(progress.approvedAndScheduledCount).toBe(1);
      expect(progress.completedEquivalent).toBe(3);
      expect(progress.isBehind).toBe(true);
      expect(progress.behindCount).toBeGreaterThanOrEqual(3);
    });

    it("marks client as on track when posted + approved/scheduled meets expected pace", () => {
      const items: ContentItem[] = Array.from({ length: 6 }, (_, idx) =>
        baseItem({
          id: `p-${idx}`,
          stage: "posted",
          postedAt: "2026-10-10T10:00:00Z",
        })
      );

      const progress = calculateCycleProgress(
        { cycleDay: 1, videosPerCycle: 12 },
        items,
        "2026-10-15"
      );

      expect(progress.postedCount).toBe(6);
      expect(progress.isBehind).toBe(false);
      expect(progress.behindCount).toBe(0);
      expect(progress.progressPercent).toBe(50);
    });
  });

  describe("3. Client Health Evaluation (Green / Amber / Red & Manual Override)", () => {
    it("returns GREEN when last activity is within 3 days and not behind", () => {
      const health = evaluateClientHealth({
        client: { lastActivityAt: "2026-10-29T10:00:00Z" },
        cycleProgress: null,
        contentItems: [],
        overdueTaskDaysMax: 0,
        hasOverduePayment: false,
        todayStr: "2026-10-31",
      });
      expect(health.status).toBe("green");
      expect(health.inactiveDays).toBe(2);
    });

    it("returns AMBER when last activity is 4 to 6 days ago", () => {
      const health = evaluateClientHealth({
        client: { lastActivityAt: "2026-10-26T10:00:00Z" },
        cycleProgress: null,
        contentItems: [],
        overdueTaskDaysMax: 0,
        hasOverduePayment: false,
        todayStr: "2026-10-31",
      });
      expect(health.status).toBe("amber");
      expect(health.inactiveDays).toBe(5);
    });

    it("returns RED when last activity is 7 or more days ago or payment is overdue", () => {
      const healthInactive = evaluateClientHealth({
        client: { lastActivityAt: "2026-10-20T10:00:00Z" },
        cycleProgress: null,
        contentItems: [],
        overdueTaskDaysMax: 0,
        hasOverduePayment: false,
        todayStr: "2026-10-31",
      });
      expect(healthInactive.status).toBe("red");

      const healthPayment = evaluateClientHealth({
        client: { lastActivityAt: "2026-10-30T10:00:00Z" },
        cycleProgress: null,
        contentItems: [],
        overdueTaskDaysMax: 0,
        hasOverduePayment: true,
        todayStr: "2026-10-31",
      });
      expect(healthPayment.status).toBe("red");
    });

    it("respects Owner manual health override when active", () => {
      const health = evaluateClientHealth({
        client: {
          lastActivityAt: "2026-10-10T10:00:00Z",
          healthOverride: "green",
          healthOverrideReason: "Client paused shoot for Diwali renovation",
          healthOverrideUntil: "2026-11-15",
        },
        cycleProgress: null,
        contentItems: [],
        overdueTaskDaysMax: 0,
        hasOverduePayment: false,
        todayStr: "2026-10-31",
      });
      expect(health.status).toBe("green");
      expect(health.isOverridden).toBe(true);
    });
  });

  describe("4. Priority Score for Today (Exact Weights & Cap)", () => {
    it("computes exact score with base + overdue cap + red client + approval wait + shoot bonus", () => {
      // P1 base = 100
      // 3 days overdue = +30
      // clientHealth red = +30
      // waitingApprovalDays 4 (>2) = +25
      // Total = 185
      const res = calculatePriorityScore({
        priority: "P1",
        dueOn: "2026-10-28",
        todayStr: "2026-10-31",
        clientHealth: "red",
        waitingApprovalDays: 4,
      });

      expect(res.score).toBe(185);
      expect(res.overdueDays).toBe(3);
      expect(res.reasonSummary).toContain("Overdue 3 days");
      expect(res.reasonSummary).toContain("client is red");
    });

    it("caps overdue bonus at +60 even if 10 days overdue", () => {
      // P2 base = 50 + overdue cap 60 = 110
      const res = calculatePriorityScore({
        priority: "P2",
        dueOn: "2026-10-15",
        todayStr: "2026-10-31",
      });
      expect(res.score).toBe(110);
    });

    it("adds +40 when due today", () => {
      // P3 base = 20 + due today 40 = 60
      const res = calculatePriorityScore({
        priority: "P3",
        dueOn: "2026-10-31",
        todayStr: "2026-10-31",
      });
      expect(res.score).toBe(60);
      expect(res.reasonSummary).toContain("Due today");
    });
  });

  describe("5. Paise Integer Money Math, Indian Digit Grouping & Amount in Words", () => {
    it("formats paise into Indian Rupee grouping without rounding", () => {
      expect(formatPaiseToINR(12500000)).toBe("₹1,25,000");
      expect(formatPaiseToINR(3500050)).toBe("₹35,000.50");
      expect(formatPaiseToINR(2950000)).toBe("₹29,500");
    });

    it("converts paise amounts to exact Indian numbering words (Lakh, Crore, Paise)", () => {
      expect(amountInWordsINR(2950000)).toBe(
        "Rupees Twenty Nine Thousand Five Hundred Only"
      );
      expect(amountInWordsINR(12500000)).toBe(
        "Rupees One Lakh Twenty Five Thousand Only"
      );
      expect(amountInWordsINR(4130075)).toBe(
        "Rupees Forty One Thousand Three Hundred and Seventy Five Paise Only"
      );
    });

    it("calculates invoice subtotal, 18% GST, and total in exact integer paise", () => {
      const totals = calculateInvoiceTotalsPaise(
        [
          { quantity: 1, unitPricePaise: 2500000 }, // ₹25,000
          { quantity: 2, unitPricePaise: 250000 }, // ₹5,000
        ],
        true,
        18
      );
      expect(totals.subtotalPaise).toBe(3000000); // ₹30,000
      expect(totals.gstAmountPaise).toBe(540000); // ₹5,400
      expect(totals.totalPaise).toBe(3540000); // ₹35,400
    });

    it("formats invoice numbers in OM-YYYY-NNN format", () => {
      expect(formatDocumentNumber("OM", 2026, 7)).toBe("OM-2026-007");
      expect(formatDocumentNumber("OMQ", 2026, 14)).toBe("OMQ-2026-014");
    });
  });

  describe("6. Spelling Guard, Request Triage SLA & DD/MM/YYYY Dates", () => {
    it("warns when known wrong client spellings are typed (e.g., Heaven Solutions, Divoliya, Ma Sharda)", () => {
      const clients = [
        {
          id: "c1",
          officialName: "Maa Sharda Jewellers",
          wrongSpellings: ["Ma Sharda Jewellers", "Maa Sharda Jeweler", "Maa Sharda Jwellers"],
        },
        {
          id: "c2",
          officialName: "Haven Solutions",
          wrongSpellings: ["Heaven Solutions", "Hevan Solutions"],
        },
        {
          id: "c3",
          officialName: "Devolia Resort",
          wrongSpellings: ["Divoliya Resort", "Devoliya Resort"],
        },
      ];

      const warnings1 = checkSpellingGuard("Diwali Reel for Heaven Solutions", clients);
      expect(warnings1).toHaveLength(1);
      expect(warnings1[0].officialName).toBe("Haven Solutions");

      const warnings2 = checkSpellingGuard("Wedding Shoot at Divoliya Resort", clients);
      expect(warnings2).toHaveLength(1);
      expect(warnings2[0].officialName).toBe("Devolia Resort");
    });

    it("flags untriaged requests older than 4 hours", () => {
      const check = isRequestOverdueForTriage(
        "2026-10-31T04:00:00Z",
        "new",
        "2026-10-31T09:30:00Z",
        4
      );
      expect(check.isFlagged).toBe(true);
      expect(check.hoursElapsed).toBe(5.5);
    });

    it("formats dates strictly as DD/MM/YYYY", () => {
      expect(formatDateDDMMYYYY("2026-10-31")).toBe("31/10/2026");
      expect(formatDateDDMMYYYY("2026-04-05")).toBe("05/04/2026");
    });
  });
});
