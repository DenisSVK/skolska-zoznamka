import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

function getUserId(req) {
    const cookies = req.headers.cookie || "";
    const match = cookies.match(/(?:^|;\s*)user_id=([^;]+)/);

    return match ? match[1] : null;
}

export default async function handler(req, res) {

    const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({
            error: "Nie si prihlásený."
        });
    }

    try {

        /* =========================
           GET - ZOZNAM BLOKOVANÝCH
        ========================= */

        if (req.method === "GET") {

            const blockedUsers = await sql`
                SELECT
                    p.id,
                    p.username,
                    p.class_name,
                    p.profile_image
                FROM blocks b
                JOIN profiles p
                    ON p.id = b.blocked_id
                WHERE b.blocker_id = ${userId}
                ORDER BY b.created_at DESC
            `;

            return res.status(200).json({
                blockedUsers
            });
        }


        /* =========================
           POST - ZABLOKOVANIE
        ========================= */

        if (req.method === "POST") {

            const { blockedId } = req.body || {};

            if (!blockedId) {
                return res.status(400).json({
                    error: "Chýba používateľ."
                });
            }

            if (blockedId === userId) {
                return res.status(400).json({
                    error: "Nemôžeš zablokovať sám seba."
                });
            }

            await sql`
                INSERT INTO blocks (
                    blocker_id,
                    blocked_id
                )
                VALUES (
                    ${userId},
                    ${blockedId}
                )
                ON CONFLICT (
                    blocker_id,
                    blocked_id
                )
                DO NOTHING
            `;

            return res.status(200).json({
                message: "Používateľ bol zablokovaný."
            });
        }


        /* =========================
           DELETE - ODBLOKOVANIE
        ========================= */

        if (req.method === "DELETE") {

            const blockedId =
                req.query.user;

            if (!blockedId) {
                return res.status(400).json({
                    error: "Chýba používateľ."
                });
            }

            await sql`
                DELETE FROM blocks
                WHERE blocker_id = ${userId}
                AND blocked_id = ${blockedId}
            `;

            return res.status(200).json({
                message: "Používateľ bol odblokovaný."
            });
        }


        return res.status(405).json({
            error: "Metóda nie je povolená."
        });

    } catch (error) {

        console.error("BLOCKS API ERROR:", error);

        return res.status(500).json({
            error: "Nepodarilo sa spracovať blokovanie."
        });
    }
}
