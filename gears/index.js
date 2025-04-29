import fs from "fs-extra";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI("AIzaSyA71dejbWMRK8jTqRhUIoa_uvWIjj0Lpe4");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function generate_gears(context) {
  const bracketConfig = `{
    "stndrd": 1,
    "untityp": 2,
    "numTeeth": ,
    "circularPitch": ,
    "pressureAngle": 20,
    "teethtyp": 1,
    "clearance": ,
    "thickness": ,
    "centerholeradius": ,
    "isCustomPressureAngle": false,
    "customPressureAngle": 0,
    "color": #000000
  }`;

  const promptL1 = `1) Analyse the user requirements : ${context}

  2) Using the requirements from point 1, generate a JSON in this exact format:
     ${bracketConfig}

  3) numTeeth is the number of teeth in the gears. 
     thickness is the gear height.
     clearance is the teeth length from the center of the gear.

  4) The stndrd field is always 1. 
     untityp has these conventions: 
       - inches = 3 
       - mm = 2 
       - cm = 1

  5) pressureAngle has valid options: 14.5, 20, 25. 
     If any other value is chosen, set isCustomPressureAngle to true and set customPressureAngle to the given angle.

  6) The image below provides an idea for the gear. 
     The red line represents hole diameter (half of which is centerholeradius). 
     The yellow line represents circularPitch.

  7) circularPitch should be at least 2x centerholeradius.
     clearance should be less than circularPitch. And also Color to be in hex format only 

  8) **Return ONLY the JSON response** in this exact format:
     ${bracketConfig}`;

  const imageL1 = {
    inlineData: {
      data: Buffer.from(fs.readFileSync("gears/gear.png")).toString("base64"),
      mimeType: "image/png",
    },
  };

  try {
    const result = await model.generateContent([promptL1, imageL1]);
    const json_container = result.response.text();

    // Extract JSON response correctly
    const jsonMatch = json_container.match(/{[\s\S]*}/);
    if (jsonMatch) {
      const finalOutput = {
        response: JSON.stringify(JSON.parse(jsonMatch[0])),
      };
      console.log(finalOutput);
      return finalOutput;// Ensure valid JSON
    }
    
    throw new Error("Invalid JSON format from AI");
  } catch (error) {
    console.error("Error generating gear JSON:", error);
    return { error: "Failed to generate gear JSON" };
  }
}

// Export function for dynamic import
export default generate_gears;
