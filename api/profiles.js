import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

function getUserId(req) {

    const cookies = req.headers.cookie || "";

    const match = cookies.match(
        /(?:^|;\s*)user_id=([^;]+)/
    );

    return match ? match[1] : null;
}

export default async function handler(req, res) {

    if (req.method !== "GET") {

        return res.status(405).json({
            error: "Metóda nie je povolená."
        });

    }

    const currentUserId = getUserId(req);

    if (!currentUserId) {

        return res.status(401).json({
            error: "Nie si prihlásený."
        });

    }

    try {

        const className =
            req.query.class || "";

        const interests =
            req.query.interests || "";


        let profiles;


        if (className && interests) {

            profiles = await sql`
                SELECT
                    id,
                    username,
                    class_name,
                    bio,
                    interests,
                    instagram,
                    profile_image
                FROM profiles
                WHERE id != ${currentUserId}
                AND class_name = ${className}
                AND interests ILIKE ${"%" + interests + "%"}
                ORDER BY created_at DESC
            `;

        } else if (className) {

            profiles = await sql`
                SELECT
                    id,
                    username,
                    class_name,
                    bio,
                    interests,
                    instagram,
                    profile_image
                FROM profiles
                WHERE id != ${currentUserId}
                AND class_name = ${className}
                ORDER BY created_at DESC
            `;

        } else if (interests) {

            profiles = await sql`
                SELECT
                    id,
                    username,
                    class_name,
                    bio,
                    interests,
                    instagram,
                    profile_image
                FROM profiles
                WHERE id != ${currentUserId}
                AND interests ILIKE ${"%" + interests + "%"}
                ORDER BY created_at DESC
            `;

        } else {

            profiles = await sql`
                SELECT
                    id,
                    username,
                    class_name,
                    bio,
                    interests,
                    instagram,
                    profile_image
                FROM profiles
                WHERE id != ${currentUserId}
                ORDER BY created_at DESC
            `;

        }


        return res.status(200).json({
            profiles
        });


    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Nepodarilo sa načítať profily."
        });

    }

}
