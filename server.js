import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { exec } from 'child_process';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getDb, generateBookingId } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_sdhero_patna';

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token missing.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// ----------------------------------------------------
// CUSTOMER APIS
// ----------------------------------------------------

// Load Symptom Knowledge Base
const symptomDbPath = path.join(__dirname, 'symptom_knowledge_base.json');
let symptomKnowledgeBase = [];
try {
  const fileData = fs.readFileSync(symptomDbPath, 'utf8');
  symptomKnowledgeBase = JSON.parse(fileData);
  console.log(`Loaded ${symptomKnowledgeBase.length} symptom entries from database.`);
} catch (error) {
  console.error('Failed to load symptom knowledge base:', error);
}

// Tokenizer and STOP_WORDS for Token Overlap search
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 
  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 
  'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 
  'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 
  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 
  'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 
  'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now',
  'bike', 'scooter', 'motorcycle', 'scooty', 'gadi', 'vehicle', 'wheels',
  'hai', 'ka', 'ki', 'mein', 'se', 'ho', 'raha', 'chal', 'rha', 'ko', 'me'
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

function cleanAndParseJson(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return JSON.parse(cleaned.trim());
}

// Symptom Checker AI Endpoint
app.post('/api/symptom-check', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query string is required.' });
    }

    const trimmedQuery = query.trim().substring(0, 500);
    if (!trimmedQuery) {
      return res.status(400).json({ error: 'Query cannot be empty.' });
    }

    // Token-overlap keyword matching
    const queryTokens = tokenize(trimmedQuery).filter(w => !STOP_WORDS.has(w));
    const activeTokens = queryTokens.length > 0 ? queryTokens : tokenize(trimmedQuery);

    const scored = symptomKnowledgeBase.map(entry => {
      let score = 0;
      const descTokens = tokenize(entry.issue_description);
      const causeTokens = entry.likely_causes.flatMap(c => tokenize(c));
      const fixTokens = tokenize(entry.typical_fix);

      for (const q of activeTokens) {
        if (descTokens.includes(q)) {
          score += 3;
        } else if (descTokens.some(d => d.includes(q) || q.includes(d))) {
          score += 1.5;
        }
        if (causeTokens.includes(q)) {
          score += 2;
        } else if (causeTokens.some(c => c.includes(q) || q.includes(c))) {
          score += 1;
        }
        if (fixTokens.includes(q)) {
          score += 1;
        }
      }
      return { entry, score };
    });

    const sorted = scored.sort((a, b) => b.score - a.score);
    const topMatches = sorted
      .filter(item => item.score > 0)
      .slice(0, 4)
      .map(item => item.entry);

    if (topMatches.length === 0) {
      return res.json({
        match_found: false,
        recommendation: "We couldn't find a direct match for your symptom in our database. Since safety is our top priority, we recommend bringing your bike to our Patna workshop for a physical inspection by our expert technicians.",
        cta: "Book a physical inspection at SD Hero"
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("ANTHROPIC_API_KEY is not configured. Using rule-based fallback.");
      const top = topMatches[0];
      return res.json({
        match_found: true,
        diagnoses: [
          {
            cause: top.likely_causes[0],
            probability: "High",
            typical_fix: top.typical_fix,
            cost_range_inr: top.cost_range_inr,
            urgency_level: top.urgency_level
          }
        ],
        recommendation: "Here is the closest match from our database. Please book a service to have it verified.",
        cta: "Book a service with SD Hero"
      });
    }

    const systemPrompt = `You are an expert bike mechanic assistant for SD Hero Service, a premium two-wheeler garage in Patna.
Your task is to analyze the customer's bike symptom description and provide a diagnosis using ONLY the provided symptom database context.
Do NOT invent any causes, costs, or urgency levels. You must strictly base your diagnosis on the provided context matches.

Context (Matches from our symptom database):
${JSON.stringify(topMatches, null, 2)}

Instructions:
1. Compare the customer's description with the provided context entries.
2. If one or more context entries are relevant to the customer's problem, select the top 2-3 most likely causes, rank them by probability, and extract their costs and urgency levels from the matched context.
3. You must format your response as a strict JSON object with the following structure:
{
  "match_found": true,
  "diagnoses": [
    {
      "cause": "Specific cause (from the matching context)",
      "probability": "High" | "Medium" | "Low",
      "typical_fix": "Description of the fix (from the matching context)",
      "cost_range_inr": "Estimated cost range (from the matching context, e.g., '250 - 650')",
      "urgency_level": "Fix now" | "Fix this week" | "Can wait"
    }
  ],
  "recommendation": "A short, professional message summarizing the findings.",
  "cta": "Book a service with SD Hero today to get your bike inspected by our expert mechanics."
}

4. If NONE of the provided context entries match or are relevant to the customer's description, or if the customer's query is completely unrelated to two-wheeler mechanical/electrical issues, you MUST return:
{
  "match_found": false,
  "recommendation": "We couldn't find a direct match for your symptom in our database. Since safety is our top priority, we recommend bringing your bike to our Patna workshop for a physical inspection by our expert technicians.",
  "cta": "Book a physical inspection at SD Hero"
}

Ensure the output is ONLY the JSON block. Do not include any conversational filler, markdown formatting (no \`\`\`json blocks), or extra text outside the JSON object.`;

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Customer symptom description: "${trimmedQuery}"`
          }
        ]
      })
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('Claude API error response:', errText);
      throw new Error(`Claude API call failed with status ${apiResponse.status}`);
    }

    const apiData = await apiResponse.json();
    const content = apiData.content?.[0]?.text;
    if (!content) {
      throw new Error('Empty response from Claude API');
    }

    try {
      const result = cleanAndParseJson(content);
      res.json(result);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content, parseError);
      res.json({
        match_found: false,
        recommendation: "We had trouble analyzing your symptom description. Please describe it differently or book a physical inspection.",
        cta: "Book an inspection"
      });
    }

  } catch (error) {
    console.error('Symptom check error:', error);
    res.status(500).json({ error: 'Failed to process symptom check.' });
  }
});

// 1. Submit a booking request
app.post('/api/bookings', async (req, res) => {
  try {
    const { customerName, phone, vehicleBrand, vehicleModel, serviceType, description, bookingDate, vehicleImage } = req.body;

    if (!customerName || !phone || !vehicleBrand || !vehicleModel || !serviceType || !bookingDate) {
      return res.status(400).json({ error: 'All fields except description are required.' });
    }

    const db = await getDb();
    const id = generateBookingId();

    await db.run(
      `INSERT INTO bookings (id, customer_name, phone, vehicle_brand, vehicle_model, service_type, description, booking_date, vehicle_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, customerName, phone, vehicleBrand, vehicleModel, serviceType, description || '', bookingDate, vehicleImage || null]
    );

    res.status(201).json({
      success: true,
      message: 'Booking request registered successfully.',
      bookingId: id
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to register booking request. Please try again later.' });
  }
});

// 2. Track booking status
app.get('/api/bookings/track', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Tracking query (Booking ID or Phone) is required.' });
    }

    const db = await getDb();
    const trimmedQuery = query.trim();

    let bookings = [];
    if (trimmedQuery.toUpperCase().startsWith('SDH-')) {
      // Find single booking by ID
      const booking = await db.get('SELECT * FROM bookings WHERE UPPER(id) = ?', [trimmedQuery.toUpperCase()]);
      if (booking) {
        bookings.push(booking);
      }
    } else {
      // Find bookings by phone number (match exact or suffix to support Indian country code formats)
      bookings = await db.all(
        'SELECT * FROM bookings WHERE phone = ? OR phone LIKE ? ORDER BY created_at DESC', 
        [trimmedQuery, `%${trimmedQuery}`]
      );
    }

    res.json(bookings);
  } catch (error) {
    console.error('Error tracking booking:', error);
    res.status(500).json({ error: 'Failed to retrieve tracking info.' });
  }
});

// ----------------------------------------------------
// ADMIN APIS
// ----------------------------------------------------

// Autologin by scan key
app.get('/api/admin/autologin', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ error: 'Autologin key required.' });
    }

    const defaultPass = process.env.ADMIN_PASSWORD || '318eklavya';
    if (key === defaultPass) {
      const token = jwt.sign({ username: 'eklavya434' }, JWT_SECRET, { expiresIn: '30d' }); // 30 days session
      return res.json({ success: true, token });
    }

    res.status(401).json({ error: 'Invalid autologin key.' });
  } catch (error) {
    console.error('Autologin error:', error);
    res.status(500).json({ error: 'Server error during autologin.' });
  }
});

// 3. Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const db = await getDb();
    const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ username: admin.username }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

// 4. Retrieve all bookings (Admin only)
app.get('/api/admin/bookings', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const bookings = await db.all('SELECT * FROM bookings ORDER BY created_at DESC');
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

// 5. Update a booking status and notes (Admin only)
app.put('/api/admin/bookings/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, technician_notes, estimated_cost, health_report } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const db = await getDb();
    const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [id]);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    await db.run(
      `UPDATE bookings 
       SET status = ?, technician_notes = ?, estimated_cost = ?, health_report = ?
       WHERE id = ?`,
      [status, technician_notes || '', estimated_cost || 0, health_report || null, id]
    );

    res.json({ success: true, message: 'Booking updated successfully.' });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking.' });
  }
});

// Initialize DB and start listening
if (process.env.VERCEL) {
  // Serverless execution: Warm up DB schema on start
  getDb().catch(err => {
    console.error('Failed to initialize database schema in serverless mode:', err);
  });
} else {
  // Local or container startup
  try {
    const db = await getDb();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  🏍️  SD HERO SERVICE Service Centre API RUNNING ON PORT ${PORT}`);
      console.log(`  🌐  Local URL: http://localhost:${PORT}`);
      console.log(`=======================================================`);

      // Automatically generate the latest PDF/HTML codebase blueprint on startup
      exec('node scratch/generate_pdf_html.js', (err, stdout, stderr) => {
        if (err) {
          console.error('⚠️ Failed to auto-generate codebase blueprint:', err);
        } else {
          console.log(stdout.trim());
        }
      });
    });
  } catch (err) {
    console.error('Database connection failed. Server cannot start.', err);
    process.exit(1);
  }
}

export default app;

