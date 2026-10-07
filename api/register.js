import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

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

        return res.status(200).json({
            message: "Dáta boli prijaté."
        });

    } catch (error) {
        return res.status(500).json({
            error: "Chyba servera."
        });
    }
}
