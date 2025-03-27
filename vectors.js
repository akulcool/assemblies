import { Pinecone } from "@pinecone-database/pinecone";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { GoogleGenerativeAI } = require("@google/generative-ai");
import { config } from "dotenv";
import fs from "fs-extra";
import dotenv from "dotenv";
import c from "config";


dotenv.config();

if (!process.env.PINECONE_API_KEY) {
  throw new Error("Pinecone API Key is missing. Check your .env file.");
} 

// Initialize Pinecone
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
console.log("Pinecone set up!!");

// Initialize Pinecone index
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI("AIzaSyA2iDVWxSJBHFp3OcpGj_ftryE28FPnZLA");
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


/**
 * Reads Q&A pairs from a text file.
 */
function readQAPairs(filename) {
    // Read the content of the file
    const content = fs.readFileSync(filename, "utf-8");
  
    // Parse the content assuming the file contains JSON formatted data
    let qaPairs = [];
    try {
      const jsonData = JSON.parse(content);
  
      // Iterate through the Q&A pairs (this assumes the JSON structure contains Q&A keys)
      for (const [index, obj] of Object.entries(jsonData)) {
        // Add each prompt & components pair to the qaPairs array
        qaPairs.push({ 
            prompt: obj.prompt,  // Use "prompt" instead of "question"
            components: JSON.stringify(obj.components) // Store the components JSON as a string
        });
    }
    
    } catch (error) {
      console.error("Error reading or parsing the file:", error);
    }
  //console.log(qaPairs)
    return qaPairs;
  }
  

/**
 * Generates an embedding using Google Gemini.
 */
async function generateEmbedding(text) {
  try {
    const result = await model.embedContent(text);
    // Gemini returns embeddings in a vector form, so we can extract it from the response
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return [];
  }
}

/**
 * Stores Q&A pairs in Pinecone.
 */
async function storeQAPairs(filename) {
  const qaPairs = readQAPairs(filename);

  for (const { prompt, components } of qaPairs) {
    const vector = await generateEmbedding(prompt.toString());

    // Ensure the vector is in the correct format before upserting to Pinecone
    if (vector && vector.length > 0) {
      await index.upsert([
        {
          id: prompt,  // Using prompt as the ID
          values: vector,
          metadata:{ components } , // Store components JSON as a string
        },
      ]);
    }
  }
  console.log("Q&A pairs stored successfully!");
}


/**
 * Retrieves the best-matching answer for a given query.
 */
async function retrieveAnswer(query) {
  const vector = await generateEmbedding(query);
  const response = await index.query({
    vector,
    topK: 1,
    includeMetadata: true,
  });

  if (response.matches.length > 0) {
    if(response.matches[0].metadata.components){
    return response.matches[0].metadata.components;
    }
    else {  return response.matches[0].metadata.answer;}
  }

  return "Sorry, I couldn't find an answer.";
}

/**
 * Main function to process a query.
 */
async function main() {
  const query = "Create a multi-angle, adjustable webcam and light holder for streamers, content creators";
  const answer = await retrieveAnswer(query);
  let isAssembly=1;
  let parsedAnswer;
  let single_comp;
  console.log(answer);
  try {
    parsedAnswer = JSON.parse(answer); // Attempt to parse the answer as JSON
  } catch (error) {
    parsedAnswer = answer;
    isAssembly=0; // Keep it as is if parsing fails
  }

  try{
    const componentNames = parsedAnswer.map(item => item["Component Type"]);
    if(componentNames.length==1){
      single_comp=parsedAnswer;
      parsedAnswer=componentNames[0];      
      isAssembly=0;
    }
  } catch (error) {
    isAssembly=0;
  }
 


  if(isAssembly==1){
const componentNames = parsedAnswer.map(item => item["Component Type"]);
const atomic_components = []; 

const placement = await model2.generateContent("how can I place the components in the assembly such that i am able to create final model.The components are as follows:\n"+JSON.stringify(parsedAnswer)+"and the objective is:"+query+"assume that i have received the atomic components only and want to assemble it so for that matter give me a pointwise manual to be followed...Provide only the points"); // Call the function from the respective module

console.log(placement.response.text());


const bracketShapes = new Set(['L', 'U', 'Z', 'T', 'C']);

parsedAnswer.forEach((component, i) => {
    if (componentNames[i] === "unknown") {
        let shape = component.Shape.toLowerCase(); 
        let firstChar = component.Shape[0].toUpperCase(); 

        if (shape.includes("cylindrical")) {
          componentNames[i] = "cylinder";
      }
       else if (bracketShapes.has(firstChar)) {
            componentNames[i] = "bracket";
        } else if (shape.includes("rectangle") ||shape.includes("rectangular")) {
            componentNames[i] = "rectangle";
        }
        else {
            componentNames[i] = "polygon";
        }
    }
});

  console.log(componentNames);
  for(let i = 0; i < componentNames.length; i++){   
    const modelPath = `./${componentNames[i]}/index.js`;
    const modelGenerator = await import(modelPath);
    let position;
    if(parsedAnswer[i].position){
    
      position = parsedAnswer[i].position;}
      else{ 
        const position_format =` "position": {"x": , "y": , "z":}`
        const prompt = "using the data in :"+placement.response.text()+"assign the position of the component:"+ parsedAnswer[i].Component.toString()+"in the format:"+position_format+"print the answer only the json format mention and give only json. Corner of the assembly is the origin of the coordinate system.NO NULL VALUES ALLOWED";
        const position_cont = (await model2.generateContent(prompt)).response.text();
        const jsonMatch = position_cont.match(/{[\s\S]*}/);
        position=JSON.parse(jsonMatch[0]).position;
      }
      console.log(position);
    
    let response_json = await modelGenerator.default(JSON.stringify(parsedAnswer[i]),isAssembly); // Call the function from the respective module
    const response = JSON.parse(response_json.response);
    response.position = position;
    console.log(response);
    atomic_components.push(JSON.stringify(response));
  }
  console.log(atomic_components);

}
else{
  if (parsedAnswer === "unknown") {
    const bracketShapes = new Set(['L', 'U', 'Z', 'T', 'C']);
    let shape = single_comp[0].Shape.toLowerCase(); 
    let firstChar = single_comp[0].Shape[0].toUpperCase(); 

     if (shape.includes("cylindrical")) {
      parsedAnswer = "cylinder";
       }
    else if (bracketShapes.has(firstChar)) {
      parsedAnswer = "bracket";
    } else if (shape.includes("rectangle") ||shape.includes("rectangular")) {
      parsedAnswer = "rectangle";
  }
  else {
    parsedAnswer = "polygon";
  } 
}
  const modelPath = `./${parsedAnswer}/index.js`;
    const modelGenerator = await import(modelPath);
    let position;
    if(parsedAnswer.position){
    
      position = parsedAnswer.position;}
      else{ 
        const position_format =` "position": {"x": , "y": , "z":}`
        const prompt = "assign the position of the component in the format:"+position_format+"print only the json. Corner of the assembly is the origin of the coordinate system.";
        const position_cont = (await model2.generateContent(prompt)).response.text();
        const jsonMatch = position_cont.match(/{[\s\S]*}/);
        position=JSON.parse(jsonMatch[0]).position;
      }
      console.log(position);
    
    let response_json = await modelGenerator.default(query,isAssembly); // Call the function from the respective module
    const response = JSON.parse(response_json.response);
    response.position = position;
    console.log(response);

}


}

// Uncomment to store Q&A pairs from a file
//await storeQAPairs("qa1.txt");

// Uncomment to test the retrieval
await main();
