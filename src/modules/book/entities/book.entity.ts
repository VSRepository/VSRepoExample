import { BookGetPayload } from "../../../generated/prisma/models.js";

export interface Book extends BookGetPayload<{ include: { author: true; genres: true } }> {}
