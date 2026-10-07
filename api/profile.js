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

        if (req.method === "POST") {

            const {
                username,
                className,
                bio,
                interests,
                instagram,
                profileImage
            } = req.body;

            if (!username || !className) {
                return res.status(400).json({
                    error: "Prezývka a trieda sú povinné."
                });
            }

            await sql`
                INSERT INTO profiles (
                    id,
                    username,
                    age,
                    class_name,
                    bio,
                    interests,
                    instagram,
                    profile_image
                )
                VALUES (
                    ${userId},
                    ${username},
                    NULL,
                    ${className},
                    ${bio || ""},
                    ${interests || ""},
                    ${instagram || ""},
                    ${profileImage || ""}
                )
                ON CONFLICT (id)
                DO UPDATE SET
                    username = EXCLUDED.username,
                    class_name = EXCLUDED.class_name,
                    bio = EXCLUDED.bio,
                    interests = EXCLUDED.interests,
                    instagram = EXCLUDED.instagram,
                    profile_image = EXCLUDED.profile_image
            `;

            return res.status(200).json({
                message: "Profil bol uložený."
            });
        }

        if (req.method === "GET") {

            const result = await sql`
                SELECT
                    username,
                    class_name,
                    bio,
                    interests,
                    instagram,
                    profile_image
                FROM profiles
                WHERE id = ${userId}
            `;

            if (result.length === 0) {
                return res.status(200).json({
                    profile: null
                });
            }

            return res.status(200).json({
                profile: result[0]
            });
        }

        return res.status(405).json({
            error: "Metóda nie je povolená."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Nepodarilo sa pracovať s profilom."
        });
    }
}
