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

        if (password.length < 8) {
            return res.status(400).json({
                error: "Heslo musí mať aspoň 8 znakov."
            });
        }

        const passwordHash = hashPassword(password);

        const result = await sql`
            INSERT INTO users (
                first_name,
                last_name,
                password_hash
            )
            VALUES (
                ${firstName},
                ${lastName},
                ${passwordHash}
            )
            RETURNING id, first_name, last_name
        `;

        return res.status(201).json({
            message: "Účet bol vytvorený.",
            user: result[0]
        });

    } catch (error) {

        if (error.code === "23505") {
            return res.status(409).json({
                error: "Používateľ s týmto menom a priezviskom už existuje."
            });
        }

        console.error(error);

        return res.status(500).json({
            error: "Nepodarilo sa vytvoriť účet."
        });
    }
}
