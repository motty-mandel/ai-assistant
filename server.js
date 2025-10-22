import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());

let siteCache = ""; // holds site text

async function refreshSiteText() {
  const res = await fetch("https://www.pcmag.com/comparisons/apple-iphone-16-vs-samsung-galaxy-s24-the-best-flagship-phone");
  const html = await res.text();
  const $ = cheerio.load(html);
  siteCache = $("body").text().replace(/\s+/g, " ").trim().slice(0, 8000);
  console.log("✅ Site text cached");
}

// Fetch once at startup
refreshSiteText();

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

  const prompt = `
You are an assistant for Chabad Lunch Orders.
Use this info to answer questions accurately:
${siteCache}
`;

    const response = await fetch("https://www.bbc.com/news/articles/ckgr71z0jp4o", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: message }
        ]
      })
    });
    console.log(response)
    const data = await response.json();

    // Defensive check
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return res.status(500).json({
        error: "Unexpected API response format",
        data
      });
    }

    res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});


app.listen(3000, () => console.log("Server running on port 3000"));
