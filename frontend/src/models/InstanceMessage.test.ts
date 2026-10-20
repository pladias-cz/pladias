import {describe, expect, it} from "vitest";
import {instanceMessageKey, parseInstanceMessages, type InstanceMessage} from "./InstanceMessage";

describe("parseInstanceMessages", () => {
    it("parses valid maintenance messages", () => {
        expect(parseInstanceMessages([{type: "warning", text: "Dnes údržba 14:00"}])).toEqual([
            {type: "warning", text: "Dnes údržba 14:00"},
        ]);
    });

    it("drops invalid entries instead of crashing the whole poll", () => {
        expect(
            parseInstanceMessages([
                {type: "info", text: "ok"},
                {type: "critical", text: "neznámý typ"},
                {text: "bez typu"},
                {type: "warning", text: ""},
                null,
                "string",
                42,
            ]),
        ).toEqual([{type: "info", text: "ok"}]);
    });

    it("returns empty array for non-array payloads (defensive against BE drift)", () => {
        expect(parseInstanceMessages(undefined)).toEqual([]);
        expect(parseInstanceMessages(null)).toEqual([]);
        expect(parseInstanceMessages({success: true})).toEqual([]);
    });
});

describe("instanceMessageKey", () => {
    it("derives a stable key from content, not array index", () => {
        const message: InstanceMessage = {type: "danger", text: "Výpadek"};
        expect(instanceMessageKey(message)).toBe("danger:Výpadek");
        // shoda obsahu = shoda klíče (bez ohledu na pozici v poli)
        expect(instanceMessageKey({type: "danger", text: "Výpadek"})).toBe(
            instanceMessageKey(message),
        );
    });
});
