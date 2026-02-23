import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Round 63: AI Food Analysis & Keyboard Fix", () => {
  const indexPath = path.join(__dirname, "../app/(tabs)/index.tsx");
  const indexContent = fs.readFileSync(indexPath, "utf-8");

  const routersPath = path.join(__dirname, "../server/routers.ts");
  const routersContent = fs.readFileSync(routersPath, "utf-8");

  describe("Bug Fix: Keyboard blocking input", () => {
    it("should use KeyboardAvoidingView in Add Record Modal", () => {
      expect(indexContent).toContain("KeyboardAvoidingView");
    });

    it("should use ScrollView with keyboardShouldPersistTaps inside modal", () => {
      expect(indexContent).toContain('keyboardShouldPersistTaps="handled"');
    });

    it("should set blurOnSubmit on text inputs", () => {
      expect(indexContent).toContain("blurOnSubmit");
    });
  });

  describe("Feature: AI Food Analysis (no manual calorie input)", () => {
    it("should NOT have manual calorie input field for food type", () => {
      // The old recordCalories state should be removed
      expect(indexContent).not.toContain("recordCalories");
      expect(indexContent).not.toContain("setRecordCalories");
    });

    it("should have AI analysis state", () => {
      expect(indexContent).toContain("aiAnalysisResult");
      expect(indexContent).toContain("isAnalyzing");
    });

    it("should have AI analyze button", () => {
      expect(indexContent).toContain("aiAnalyzeBtn");
      expect(indexContent).toContain("handleAiAnalyze");
    });

    it("should use foodLogs.analyzeText mutation", () => {
      expect(indexContent).toContain("trpc.foodLogs.analyzeText.useMutation");
    });

    it("should display analysis result with items, calories, and macros", () => {
      expect(indexContent).toContain("analysisResultCard");
      expect(indexContent).toContain("totalCalories");
      expect(indexContent).toContain("totalProtein");
      expect(indexContent).toContain("totalCarbs");
      expect(indexContent).toContain("totalFat");
    });

    it("should show macro pills (P/C/F)", () => {
      expect(indexContent).toContain("macroPill");
      expect(indexContent).toContain("macroRow");
    });

    it("should disable save button until AI analysis is done for food", () => {
      expect(indexContent).toContain('disabled={recordType === "food" && !aiAnalysisResult}');
    });

    it("should use multiline text input for food description", () => {
      // Food input should be multiline for natural language
      expect(indexContent).toContain("multiline");
    });
  });

  describe("Backend: analyzeText API", () => {
    it("should have analyzeText endpoint in foodLogs router", () => {
      expect(routersContent).toContain("analyzeText");
    });

    it("should accept description and language inputs", () => {
      expect(routersContent).toContain("description: z.string()");
      expect(routersContent).toContain('language: z.enum');
    });

    it("should call invokeLLM for food analysis", () => {
      expect(routersContent).toContain("invokeLLM");
    });

    it("should return foods array with nutrition data", () => {
      expect(routersContent).toContain("analysisResult");
    });
  });

  describe("Styles: AI Analysis UI", () => {
    it("should have AI analyze button styles", () => {
      expect(indexContent).toContain("aiAnalyzeBtn:");
      expect(indexContent).toContain("aiAnalyzeBtnText:");
    });

    it("should have analysis result card styles", () => {
      expect(indexContent).toContain("analysisResultCard:");
      expect(indexContent).toContain("analysisResultTitle:");
      expect(indexContent).toContain("analysisItemRow:");
    });

    it("should have macro row and pill styles", () => {
      expect(indexContent).toContain("macroRow:");
      expect(indexContent).toContain("macroPill:");
    });
  });
});
