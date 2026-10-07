import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

function getUserId(req) {
    const cookies = req.headers.cookie || "";
    const match = cookies.match(/(?:^|;\s*)user_id=([^;]+)/);

    return match ? match[1] : null;
}

export default async function handler(req, res) {

    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Metóda nie je povolená."
        });
    }

    const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({
            error: "Nie si prihlásený."
        });
    }

    try {

        const matches = await sql`
            SELECT
                p.id,
                p.username,
                p.class_name,
                p.bio,
                p.interests,
                p.instagram,
                p.profile_image
            FROM profiles p
            WHERE p.id != ${userId}
            AND EXISTS (
                SELECT 1
                FROM likes l1
                WHERE l1.from_user = ${userId}
                AND l1.to_user = p.id
            )
            AND EXISTS (
                SELECT 1
                FROM likes l2
                WHERE l2.from_user = p.id
                AND l2.to_user = ${userId}
            )
            ORDER BY p.created_at DESC
        `;

        return res.status(200).json({
            matches
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Nepodarilo sa načítať matchy."
        });
    }
}
