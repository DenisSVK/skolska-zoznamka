export default function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Metóda nie je povolená."
        });
    }

    return res.status(200).json({
        message: "Registrácia API funguje."
    });
}
