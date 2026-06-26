import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Gen AI client setup
  const apiKey = process.env.GEMINI_API_KEY;
  let aiClient: GoogleGenAI | null = null;
  if (apiKey) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // API endpoint for Fencing Design Consultant
  app.post('/api/gemini/consult', async (req, res) => {
    const { prompt, config, linearFeet, segmentsCount, gatesCount, chatHistory } = req.body;

    if (!aiClient) {
      return res.json({
        response:
          "The Gemini AI Consultant is currently offline because the Google API Key is missing. To activate structural evaluations, gale-force wind calculations, and budgeting tips, please add your Gemini API Key in 'Settings > Secrets' (key: 'GEMINI_API_KEY').",
      });
    }

    try {
      const systemInstruction = `You are a professional Fencing Structural Architect, Soil Engineer, and Materials Estimator with 20+ years of active experience in commercial and residential fencing.
You are consultatively advising a user building their fence design in our "Fencing Pro Visualizer (2nd Design)" application.

Current Active Fence Configuration Parameters:
- Material Style: ${config.style}
- Color/Finish: ${config.color}
- Height: ${config.height} Feet
- Post Caps: ${config.cap} style
- Slat Opening/Gap: ${config.gap}
- Slat Alignment/Symmetry: ${config.alignment}
- Post-to-Post spacing: ${config.postSpacing} Feet spacing

Layout Metrics:
- Total Perimeter Length: ${linearFeet} Linear Feet
- Distinct Fence Spans (Segments): ${segmentsCount}
- Fence Gates Added: ${gatesCount}

Your instructions:
1. Provide highly descriptive, technical, and visually interesting suggestions about their choices.
2. Structure your replies using clear bullet points.
3. Assess the wind load risk based on height ${config.height}ft, style ${config.style}, and slat gap ${config.gap}. (e.g., solid privacy wood fences over 6ft pose high wind resistance, suggesting heavy concrete footers and 6ft post spacings instead of 8ft).
4. Evaluate material properties: Wood requires restaining/resilience; Vinyl is zero-maintenance but cracks under impact; Aluminum is elegant, secure but has pickets with gaps; Composite mimics wood grain premium grade but is heavier.
5. Offer smart costing recommendations (e.g. how changing heights or post spacing can optimize wood panel yields to save up to 25%).
6. Maintain a professional, encouraging, and structured architect-consultant tone. Do not use markdown headers that are excessively large, keep format highly clean and compact.`;

      // Formulate query block
      const contents = chatHistory
        ? chatHistory.map((h: any) => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.text }],
          }))
        : [];

      // Append latest query
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });

      const result = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const responseText = result.text || "Structural blueprint check successful.";
      res.json({ response: responseText });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to consult with fence specialist.', details: err.message });
    }
  });

  // Vite integration middleware for development vs static build folder for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fencing Pro Visualizer backend running on ports: http://0.0.0.0:${PORT}`);
  });
}

startServer();
