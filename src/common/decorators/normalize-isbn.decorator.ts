import { Transform, TransformOptions } from "class-transformer";

export function NormalizeISBN(options?: TransformOptions) {
    return Transform(
        ({ value }) => (typeof value === "string" ? value.replace(/[^0-9X]/gi, "").toUpperCase() : value),
        options,
    );
}
