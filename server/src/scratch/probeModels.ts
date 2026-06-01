import "../lib/env.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

const LITE_MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-3.1-flash-lite"
];

async function testModel(modelName: string) {
  console.log(`🔑 Testing model [${modelName}]...`);
  if (!apiKey) return;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const response = await model.generateContent("hello");
    console.log(`   ✅ Success! Response: "${response.response.text().trim()}"`);
    return true;
  } catch (err: any) {
    console.log(`   ❌ Failed: ${err.message.split('\n')[0]}`);
    return false;
  }
}

async function main() {
  console.log("Probing lite model endpoints...");
  for (const m of LITE_MODELS) {
    await testModel(m);
  }
}

main().catch(console.error);
