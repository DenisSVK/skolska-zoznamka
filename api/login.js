import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

const sql = neon(process.env.DATABASE_URL);

function hashPassword(password) {
    return crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
}

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Metóda nie je povolená."
        });
    }

    try {

        const { firstName, lastName, password } = req.body;

        if (!firstName || !lastName || !password) {
            return res.status(400).json({
                error: "Vyplň všetky polia."
            });
        }

        const passwordHash = hashPassword(password);

        const result = await sql`
            SELECT id, first_name, last_name
            FROM users
            WHERE first_name = ${firstName}
            AND last_name = ${lastName}
            AND password_hash = ${passwordHash}
        `;

        if (result.length === 0) {
            return res.status(401).json({
                error: "Nesprávne meno, priezvisko alebo heslo."
            });
        }

        const user = result[0];

        res.setHeader(
            "Set-Cookie",
            `user_id=${user.id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
        );

        return res.status(200).json({
            message: "Prihlásenie úspešné."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Chyba servera."
        });
    }
}
