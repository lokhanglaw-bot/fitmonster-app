import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Unfriend Confirmation Modal", () => {
  const battleCode = fs.readFileSync(
    path.join(__dirname, "../app/(tabs)/battle.tsx"),
    "utf-8"
  );

  it("should use Modal instead of Alert.alert for unfriend confirmation", () => {
    // The unfriend handler should NOT use Alert.alert
    // Instead it should set unfriendTarget state to open a Modal
    const unfriendHandlerMatch = battleCode.match(
      /const handleUnfriend = useCallback\(\(friend.*?\n([\s\S]*?)\}, \[/
    );
    expect(unfriendHandlerMatch).toBeTruthy();
    const handlerBody = unfriendHandlerMatch![1];
    // Should NOT contain Alert.alert
    expect(handlerBody).not.toContain("Alert.alert");
    // Should set unfriendTarget
    expect(handlerBody).toContain("setUnfriendTarget");
  });

  it("should have unfriendTarget state variable", () => {
    expect(battleCode).toContain("const [unfriendTarget, setUnfriendTarget] = useState<Friend | null>(null)");
  });

  it("should render a Modal component for unfriend confirmation", () => {
    // Check that there's a Modal with unfriendTarget visibility
    expect(battleCode).toContain("visible={!!unfriendTarget}");
    expect(battleCode).toContain("onRequestClose={cancelUnfriend}");
  });

  it("should have Cancel and Remove buttons in the modal", () => {
    expect(battleCode).toContain("onPress={cancelUnfriend}");
    expect(battleCode).toContain("onPress={confirmUnfriend}");
  });

  it("should have confirmUnfriend function that calls unfriendMutation", () => {
    expect(battleCode).toContain("const confirmUnfriend = useCallback");
    expect(battleCode).toContain("unfriendMutation.mutate({ friendId: unfriendTarget.id }");
  });

  it("should have cancelUnfriend function that clears unfriendTarget", () => {
    expect(battleCode).toContain("const cancelUnfriend = useCallback");
    // cancelUnfriend should set unfriendTarget to null
    const cancelMatch = battleCode.match(
      /const cancelUnfriend = useCallback\(\(\) => \{[\s\S]*?setUnfriendTarget\(null\)/
    );
    expect(cancelMatch).toBeTruthy();
  });

  it("should have unfriendStyles with overlay, dialog, and button styles", () => {
    expect(battleCode).toContain("const unfriendStyles = StyleSheet.create");
    expect(battleCode).toContain("overlay:");
    expect(battleCode).toContain("dialog:");
    expect(battleCode).toContain("buttonRow:");
    expect(battleCode).toContain("btn:");
  });

  it("should display friend name in the confirmation message", () => {
    expect(battleCode).toContain('unfriendTarget?.name || ""');
  });
});
