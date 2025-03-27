import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Fuse = require("fuse.js"); // Import Fuse.js for fuzzy matching
const fs = require("fs-extra"); // Import the File System module

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Initialize Google Generative AI with your API key
const genAI = new GoogleGenerativeAI("AIzaSyA2iDVWxSJBHFp3OcpGj_ftryE28FPnZLA");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// In-memory store for session-based JSON states
const sessionStates = {};




function parseTable(table) {
    const lines = table.trim().split('\n'); // Split table into lines
    const data = {};
  
    // Skip the header and divider (first 2 lines)
    for (let i = 2; i < lines.length; i++) {
      const row = lines[i].split('|').map(cell => cell.trim()); // Split each row by '|'
      const parameter = row[1]; // Parameter column
      const value = parseFloat(row[2]); // Convert Value to number
      data[parameter] = value; // Store in an object
    }
  
    return data;
  }

async function  generate_u_bracket(usable_bracket,context,isAssembly){
    const bracketConfig = `{
        "show2d": true,
        "show3d": true,
        "bracketsType": "U Bracket",
        "dimensionType": "Inner Faces",
        "material": "Mild Steel",
        "kfactor": "0.5",
        "bracketDimensions": {
          "length1": ,
          "length2": ,
          "length3": ,
          "length4": ,
          "length5": ,
          "height": ,
          "offSetType": "Inner",
          "thickness": 2
        },
        "holes": [
          {
            "holeDiameter": ,
            "position": "",
            "Xvalue": ,
            "Zvalue": 
          }
        ],
        "patterns": [
          {
            "type": "Circular",
            "position": "",
            "numberOfPattern": 4,
            "holeSize": 5,
            "distancebetweenPattern": 10,
            "Zvalue": 20,
            "Xvalue": 0,
            "length": 10,
            "width": 20,
            "radius": 2
          }
        ]
      }`;      
    
      let dimension_table="";
      const promptb = "Context:"+context+"\n. Task:Using the below image and guidelines provide length1,length2,length3 and height for the"+usable_bracket+ "bracket\n2)Print the result in tabular form \n3)One column for the label and the other for values.Print only the table and all labels must be in smallcase\n4)provide all values in mm and dont give units along with values"
      const image = {
      inlineData:{
          data:Buffer.from(fs.readFileSync("bracket/U.png")).toString("base64"),
          mimeType:"image/png",
      },
      };
      
      const resultb = await model.generateContent([promptb,image]);
       dimension_table = resultb.response.text();
        console.log(dimension_table)
      const parsedData = parseTable(dimension_table);


      if (!parsedData || typeof parsedData !== "object") {
        console.error("Error: Failed to parse AI-generated table.");
        return;
    }

      const length1=parsedData['length1']
      const length2=parsedData['length2']
      const length3=parsedData['length3']
      const height=parsedData['height']
      
      // Log the extracted values
      console.log(`Length 1: ${length1}`);
      console.log(`Length 2: ${length2}`);
      console.log(`Length 3: ${length3}`);
      console.log(`height: ${height}`);


      const assemblyconfig = `{
        "show2d": true,
        "show3d": true,
        "bracketsType": "L Bracket",
        "dimensionType": "Inner Faces",
        "material": "Mild Steel",
        "kfactor": "0.5",
        "bracketDimensions": {
          "length1":${length1} ,
          "length2": ${length2},
          "length3": ${length3},
          "length4": ${length1},
          "length5": ${length1},
          "height": ${height},
          "offSetType": "Inner",
          "thickness": 2
        },
        "holes": [
          {
            "holeDiameter":2 ,
            "position": "L1",
            "Xvalue":0 ,
            "Zvalue": 15
          }
        ],
        "patterns": [
          {
            "type": "Circular",
            "position": "",
            "numberOfPattern": 4,
            "holeSize": 5,
            "distancebetweenPattern": 10,
            "Zvalue": 10,
            "Xvalue": 0,
            "length": 10,
            "width": 20,
            "radius": 2
          }
        ]
      }`

    if(isAssembly==1){
      return assemblyconfig;
    }




      const hole_json= `"holes": [
        {
          "holeDiameter": ,
          "position": "",
          "Xvalue": ,
          "Zvalue": 
        }
      ]`

      const pattern_json=`"patterns": [
          {
            "type": "Circular",
            "position": "",
            "numberOfPattern": ,
            "holeSize": ,
            "distancebetweenPattern": ,
            "Zvalue": ,
            "Xvalue": ,
            "length": ,
            "width": ,
            "radius": 
          }
        ]`
      //just randomly fill the unused values of length
        const length_data=`"bracketLengths": {
          "length1":${length1+30} ,
          "length2": ${length2+30},
          "length3": ${length2+30},
          "length4": ${length3}, 
          "length5": ${length3},
          "height": ${height+60},
          "offSetType": "Inner",
          "thickness": 2
        },`
     
        const promptf = "Context:"+context+"\n. 1)The image here shows the face profile i.e which face is L1,L2 and L3 along with a few examples of holes and patterns. These are representative examples for reference do not use the exact ones \n2)use the context to identify the need of patterns and holes on each face.\n3)print the result in tabular form where one column is the face{L1,L2 or L3},column 2 is hole or pattern. If we choose hole then one column for hole diameter but if pattern is chosen then mention number of patterns,distance between each element and shape along with radius for circular or length/width if rectangular is chosen all of which can be put in a details column.\n3)Dimensions are:Lengths:"+length1+"and"+length2 +"and height is"+height
        const imagef = {
        inlineData:{
            data:Buffer.from(fs.readFileSync("bracket/UF.png")).toString("base64"),
            mimeType:"image/png",
        },
        };
        
        const result_cuts = await model.generateContent([promptf,imagef]);
       const  cuts_table= result_cuts.response.text();
         console.log(cuts_table)

         const promptL1 = `1) The image provided shows the profile of face L1.
         - X ranges: 0 to ${length1}
         - Z ranges: 0 to ${height}

         2)Use the table provided:${cuts_table}to get the positioning of the cutout holes or patterns mentioned for L1.Use the exact data from the table only and only for the case of L1. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L1'
      
        3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
        
        4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


      5) Ensure patterns stay **fully inside the L1 boundary**:
         - Start point **Xvalue and Zvalue** must be within limits.
         - The last pattern’s position **must not exceed the boundary**:
           - If pattern is 'Circular': 
                  - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                  - Xvalue + 2*holesize  ≤ ${length1}
           - If pattern is 'horizontal rectangle':
             - Xvalue + width  ≤ ${length1}
             - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
           - If pattern is 'vertical rectangle':
             - Xvalue + length  ≤ ${length1}
             - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
      
      6) If patterns **exceed the available space**, adjust automatically:
         - **Reduce numberOfPattern** if necessary.
         - **Decrease distanceBetweenPattern** while maintaining equal spacing.
         - If required, **scale down pattern size proportionally**.
      
      7) Maintain a **minimum margin** of ${5} mm from all edges.
      
      8) Response should be in JSON format:
         for patterns:${pattern_json}
         for holes:${hole_json}
         
      9)Put only values in the json and no intermediate calculations or explanations`;
        const imageL1 = {
        inlineData:{
            data:Buffer.from(fs.readFileSync("bracket/UL1.png")).toString("base64"),
            mimeType:"image/png",
        },
        };
        
        const result_L1 = await model.generateContent([promptL1,imageL1]);
        const  cuts_L1= result_L1.response.text();
         console.log(cuts_L1)

        // const promptL2 = " 1)The image provided shows the profile of face L2 with the maximum length along x  being:"+length2+"and along z being"+ height+"\n2)Use the table provided:"+cuts_table+"to get the positioning of the cutouts or patterns mentioned for L2.Use the exact data from the table only and only for the case of L2. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank . Avoid all cases of overlaps and place them in such a way that all of them are visible on the face and do not go out of bounds.\n3)Patterns are always created vertically and all other measurements are made the way towards +ve Z axis\n4)Response should be in json format: for holes:"+hole_json+"for patterns: "+pattern_json+"the position in all cases is 'L2'\n4)Type Classification: If you want circular patterns fill 'circular' under the type field of the JSON and fill the length and width field with 100.\n5)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2."
        const promptL2 = `1) The image provided shows the profile of face L2.
        - X ranges: 0 to ${length2}
        - Z ranges: 0 to ${height}

        2)Use the table provided:${cuts_table}to get the positioning of the cutout holes or patterns mentioned for L2.Use the exact data from the table only and only for the case of L2. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L2 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L2'
     
       3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
       
       4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


     5) Ensure patterns stay **fully inside the L1 boundary**:
        - Start point **Xvalue and Zvalue** must be within limits.
        - The last pattern’s position **must not exceed the boundary**:
          - If pattern is 'Circular': 
                 - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                 - Xvalue + 2*holesize  ≤ ${length2}
          - If pattern is 'horizontal rectangle':
            - Xvalue + width  ≤ ${length2}
            - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
          - If pattern is 'vertical rectangle':
            - Xvalue + length  ≤ ${length2}
            - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
     
     6) If patterns **exceed the available space**, adjust automatically:
        - **Reduce numberOfPattern** if necessary.
        - **Decrease distanceBetweenPattern** while maintaining equal spacing.
        - If required, **scale down pattern size proportionally**.
     
     7) Maintain a **minimum margin** of ${5} mm from all edges.
     
     8) Response should be in JSON format:
        for patterns:${pattern_json}
        for holes:${hole_json}
        
     9)Put only values in the json and no intermediate calculations or explanations`;
        const imageL2 = {
         inlineData:{
             data:Buffer.from(fs.readFileSync("bracket/UL2.png")).toString("base64"),
             mimeType:"image/png",
         },
         };
         
         const result_L2 = await model.generateContent([promptL2,imageL2]);
         const  cuts_L2= result_L2.response.text();
          console.log(cuts_L2)

         //const promptL3 = " 1)The image provided shows the profile of face L3 with the maximum length along x  being:"+length2+"and along z being"+height+"\n2)Use the table provided:"+cuts_table+"to get the positioning of the cutouts or patterns mentioned for L3.Use the exact data from the table only and only for the case of L3. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank . Avoid all cases of overlaps and place them in such a way that all of them are visible on the face and do not go out of bounds.\n3)Patterns are always created vertically and all other measurements are made the way towards +ve Z axis\n4)Response should be in json format: for holes:"+hole_json+"for patterns: "+pattern_json+"the position in all cases is 'L3'\n4)Type Classification: If you want circular patterns fill 'circular' under the type field of the JSON and fill the length and width field with 100.\n5)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2."
         const promptL3 = `1) The image provided shows the profile of face L3.
         - X ranges: 0 to ${length2}
         - Z ranges: 0 to ${height}

         2)Use the table provided:${cuts_table}to get the positioning of the cutout holes or patterns mentioned for L3.Use the exact data from the table only and only for the case of L3. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L3 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L3'
      
        3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
        
        4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


      5) Ensure patterns stay **fully inside the L1 boundary**:
         - Start point **Xvalue and Zvalue** must be within limits.
         - The last pattern’s position **must not exceed the boundary**:
           - If pattern is 'Circular': 
                  - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                  - Xvalue + 2*holesize  ≤ ${length2}
           - If pattern is 'horizontal rectangle':
             - Xvalue + width  ≤ ${length2}
             - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
           - If pattern is 'vertical rectangle':
             - Xvalue + length  ≤ ${length2}
             - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
      
      6) If patterns **exceed the available space**, adjust automatically:
         - **Reduce numberOfPattern** if necessary.
         - **Decrease distanceBetweenPattern** while maintaining equal spacing.
         - If required, **scale down pattern size proportionally**.
      
      7) Maintain a **minimum margin** of ${5} mm from all edges.
      
      8) Response should be in JSON format:
         for patterns:${pattern_json}
         for holes:${hole_json}
         
      9)Put only values in the json and no intermediate calculations or explanations`;
         const imageL3 = {
         inlineData:{
             data:Buffer.from(fs.readFileSync("bracket/UL3.png")).toString("base64"),
             mimeType:"image/png",
         },
         };
         
         const result_L3 = await model.generateContent([promptL3,imageL3]);
         const  cuts_L3= result_L3.response.text();
          console.log(cuts_L3)

          const finalprompt = "create a sheet metal in the json format as shown"+bracketConfig +"using the following data:\n1)for sizes use the exact format and values from here:"+length_data+"\n for L1 holes and patterns STRICTLY USE"+cuts_L1+"\n for L2 Holes and patterns use STRICTLY"+cuts_L2+"\n for L3 holes and patterns use STRICTLY"+cuts_L3+"\n print final json only and no extra text and please NO NULL VALUES"
          const finalJSON=await model.generateContent(finalprompt)
          const fj = finalJSON.response.text()
          const jsonMatch = fj.match(/{[\s\S]*}/);
          return jsonMatch[0];
}

async function  generate_l_bracket(usable_bracket,context,isAssembly){
    const bracketConfig = `{
        "show2d": true,
        "show3d": true,
        "bracketsType": "L Bracket",
        "dimensionType": "Inner Faces",
        "material": "Mild Steel",
        "kfactor": "0.5",
        "bracketDimensions": {
          "length1": ,
          "length2": ,
          "length3": ,
          "length4": ,
          "length5": ,
          "height": ,
          "offSetType": "Inner",
          "thickness": 2
        },
        "holes": [
          {
            "holeDiameter": ,
            "position": "L1",
            "Xvalue":,
            "Zvalue": 
          }
        ],
        "patterns": [
          {
            "type": "Circular",
            "position": "",
            "numberOfPattern": 4,
            "holeSize": 5,
            "distancebetweenPattern": 10,
            "Zvalue": 10,
            "Xvalue": 0,
            "length": 10,
            "width": 20,
            "radius": 2
          }
        ]
      }`;      
    
      let dimension_table="";
      const promptb = "Context:"+context+"\n. Task:Using the below image and guidelines provide length1,length2 and height for the"+usable_bracket+ "bracket\n2)Print the result in tabular form print table only\n3)One column for the label(all label values are to be in smallcase) and the other for value\n4)provide all values in mm and dont give units along with values"
      const image = {
      inlineData:{
          data:Buffer.from(fs.readFileSync("bracket/L.png")).toString("base64"),
          mimeType:"image/png",
      },
      };
      
      const resultb = await model.generateContent([promptb,image]);
       dimension_table = resultb.response.text();

        
      const parsedData = parseTable(dimension_table);
      if (!parsedData || typeof parsedData !== "object") {
        console.error("Error: Failed to parse AI-generated table.");
        return;
    }
    
      console.log(parsedData)

      const length1=parsedData['length1']
      const length2=parsedData['length2']
      const height=parsedData['height']
      
      // Log the extracted values
      console.log(`Length 1: ${length1}`);
      console.log(`Length 2: ${length2}`);
      console.log(`height: ${height}`);

      const assemblyconfig = `{
        "show2d": true,
        "show3d": true,
        "bracketsType": "L Bracket",
        "dimensionType": "Inner Faces",
        "material": "Mild Steel",
        "kfactor": "0.5",
        "bracketDimensions": {
          "length1":${length1} ,
          "length2": ${length2},
          "length3": ${length1},
          "length4": ${length1},
          "length5": ${length1},
          "height": ${height},
          "offSetType": "Inner",
          "thickness": 2
        },
        "holes": [
          {
            "holeDiameter":2 ,
            "position": "L1",
            "Xvalue":0 ,
            "Zvalue": 15
          }
        ],
        "patterns": [
          {
            "type": "Circular",
            "position": "",
            "numberOfPattern": 4,
            "holeSize": 5,
            "distancebetweenPattern": 10,
            "Zvalue": 10,
            "Xvalue": 0,
            "length": 10,
            "width": 20,
            "radius": 2
          }
        ]
      }`

    if(isAssembly==1){
      return assemblyconfig;
    }




      const hole_json= `"holes": [
        {
          "holeDiameter": ,
          "position": "",
          "Xvalue": ,
          "Zvalue": 
        }
      ]`

      const pattern_json=`"patterns": [
          {
            "type": "Circular",
            "position": "",
            "numberOfPattern": ,
            "holeSize": ,
            "distancebetweenPattern": ,
            "Zvalue": ,
            "Xvalue": ,
            "length": ,
            "width": ,
            "radius": 
          }
        ]`
     
        const promptf = "Context:"+context+"\n. 1)The image here shows the face profile i.e which face is L1 and L2 along with a few examples of holes and patterns. These are representative examples for reference do not use the exact ones \n2)use the context to identify the need of patterns and holes on each face.\n3)print the result in tabular form where one column is the face{L1 or L2},column 2 is hole or pattern. If we choose hole then one column for hole diameter but if pattern is chosen then mention number of patterns,distance between each element and shape along with radius for circular or length/width if rectangular is chosen all of which can be put in a details column.\n3)Dimensions are:Lengths:"+length1+"and"+length2 +"and height is"+height
        const imagef = {
        inlineData:{
            data:Buffer.from(fs.readFileSync("bracket/LF.png")).toString("base64"),
            mimeType:"image/png",
        },
        };
        
        const result_cuts = await model.generateContent([promptf,imagef]);
       const  cuts_table= result_cuts.response.text();
         console.log(cuts_table)

         const promptL1 = `1) The image provided shows the profile of face L1 with the origin at the bottom middle.
         - X ranges: ${-length1 / 2} to ${length1 / 2}
         - Z ranges: 0 to ${height}

         2)Use the table provided:${cuts_table}to get the positioning of the cutout holes or patterns mentioned for L1.Use the exact data from the table only and only for the case of L1. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L1'
      
        3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
        
        4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


      5) Ensure patterns stay **fully inside the L1 boundary**:
         - Start point **Xvalue and Zvalue** must be within limits.
         - The last pattern’s position **must not exceed the boundary**:
           - If pattern is 'Circular': 
                  - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                  - Xvalue + 2*holesize  ≤ ${length1}
           - If pattern is 'horizontal rectangle':
             - Xvalue + width  ≤ ${length1}
             - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
           - If pattern is 'vertical rectangle':
             - Xvalue + length  ≤ ${length1}
             - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
      
      6) If patterns **exceed the available space**, adjust automatically:
         - **Reduce numberOfPattern** if necessary.
         - **Decrease distanceBetweenPattern** while maintaining equal spacing.
         - If required, **scale down pattern size proportionally**.
      
      7) Maintain a **minimum margin** of ${5} mm from all edges.
      
      8) Response should be in JSON format:
         for patterns:${pattern_json}
         for holes:${hole_json}
         
      9)Put only values in the json and no intermediate calculations or explanations`;
      
        const imageL1 = {
        inlineData:{
            data:Buffer.from(fs.readFileSync("bracket/LL1.png")).toString("base64"),
            mimeType:"image/png",
        },
        };
        
        const result_L1 = await model.generateContent([promptL1,imageL1]);
        const  cuts_L1= result_L1.response.text();
         console.log(cuts_L1)

         const promptL2 = `1) The image provided shows the profile of face L2 with the origin at the bottom middle.
         - X ranges: 0 to ${length2}
         - Z ranges: 0 to ${height}

         2)Use the table provided:${cuts_table}to get the positioning of the cutouts or patterns mentioned for L2.Use the exact data from the table only and only for the case of L2. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L2 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L2'
      
        3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
        4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


        5) Ensure patterns stay **fully inside the L2 boundary**:
         - Start point **Xvalue and Zvalue** must be within limits.
         - The last pattern’s position **must not exceed the boundary**:
            - If pattern is 'Circular': 
                  - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                  - Xvalue + 2*holesize  ≤ ${length2}
           - If pattern is 'horizontal rectangle':
             - Xvalue + width  ≤ ${length2}
             - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
           - If pattern is 'vertical rectangle':
             - Xvalue + length  ≤ ${length2}
             - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
      
      6) If patterns **exceed the available space**, adjust automatically:
         - **Reduce numberOfPattern** if necessary.
         - **Decrease distanceBetweenPattern** while maintaining equal spacing.
         - If required, **scale down pattern size proportionally**.
      
      7) Maintain a **minimum margin** of ${5} mm from all edges.
      
      8) Response should be in JSON format:
         for patterns:${pattern_json}
         for holes:${hole_json}
         
      9)Put only values in the json and no intermediate calculations or explanations`;
         const imageL2 = {
         inlineData:{
             data:Buffer.from(fs.readFileSync("bracket/LL2.png")).toString("base64"),
             mimeType:"image/png",
         },
         };
         
         const result_L2 = await model.generateContent([promptL2,imageL2]);
         const  cuts_L2= result_L2.response.text();
          console.log(cuts_L2)

          const finalprompt = "create a sheet metal in the json format as shown"+bracketConfig +"using the following data:\n1)for sizes use this data length1:"+(length1+30)+"length2:"+(length2+30)+"height:"+(height+65)+"length3,length4 and length5 is always 100\n for L1 holes and patterns STRICTLY USE"+cuts_L1+"\n for L2 Holes and patterns use STRICTLY"+cuts_L2+"\n print final json only and no extra text and please NO NULL VALUES"
          const finalJSON=await model.generateContent(finalprompt)
          const fj = finalJSON.response.text()
          const jsonMatch = fj.match(/{[\s\S]*}/);
          return jsonMatch[0];
}

async function  generate_z_bracket(usable_bracket,context,isAssembly){
    const bracketConfig = `{
        "show2d": true,
        "show3d": true,
        "bracketsType": "Z Bracket",
        "dimensionType": "Inner Faces",
        "material": "Mild Steel",
        "kfactor": "0.5",
        "bracketDimensions": {
          "length1": ,
          "length2": ,
          "length3": ,
          "length4": ,
          "length5": ,
          "height": ,
          "offSetType": "Inner",
          "thickness": 2
        },
        "holes": [
          {
            "holeDiameter": ,
            "position": "",
            "Xvalue": ,
            "Zvalue": 
          }
        ],
        "patterns": [
          {
            "type": "Circular",
            "position": "",
            "numberOfPattern": 4,
            "holeSize": 5,
            "distancebetweenPattern": 10,
            "Zvalue": 20,
            "Xvalue": 0,
            "length": 10,
            "width": 20,
            "radius": 2
          }
        ]
      }`;      
    
      let dimension_table="";
      const promptb = "Context:"+context+"\n. Task:Using the below image and guidelines provide length1,length2,length3 and height for the"+usable_bracket+ "bracket\n2)Print the result in tabular form \n3)One column for the label and the other for values. Print only the table and the labels should all be in smallcase\n4)provide all values in mm and dont give units along with values."
      const image = {
      inlineData:{
          data:Buffer.from(fs.readFileSync("bracket/Z.png")).toString("base64"),
          mimeType:"image/png",
      },
      };
      
      const resultb = await model.generateContent([promptb,image]);
       dimension_table = resultb.response.text();

      const parsedData = parseTable(dimension_table);
      if (!parsedData || typeof parsedData !== "object") {
        console.error("Error: Failed to parse AI-generated table.");
        return;
    }
    
      console.log(dimension_table)
      
      const length1=parsedData['length1']
      const length2=parsedData['length2']
      const length3=parsedData['length3']
      const height=parsedData['height']
      
      // Log the extracted values
      console.log(`Length 1: ${length1}`);
      console.log(`Length 2: ${length2}`);
      console.log(`Length 3: ${length3}`);
      console.log(`height: ${height}`);

      const assemblyconfig = `{
        "show2d": true,
        "show3d": true,
        "bracketsType": "L Bracket",
        "dimensionType": "Inner Faces",
        "material": "Mild Steel",
        "kfactor": "0.5",
        "bracketDimensions": {
          "length1":${length1} ,
          "length2": ${length2},
          "length3": ${length3},
          "length4": ${length1},
          "length5": ${length1},
          "height": ${height},
          "offSetType": "Inner",
          "thickness": 2
        },
        "holes": [
          {
            "holeDiameter":2 ,
            "position": "L1",
            "Xvalue":0 ,
            "Zvalue": 15
          }
        ],
        "patterns": [
          {
            "type": "Circular",
            "position": "",
            "numberOfPattern": 4,
            "holeSize": 5,
            "distancebetweenPattern": 10,
            "Zvalue": 10,
            "Xvalue": 0,
            "length": 10,
            "width": 20,
            "radius": 2
          }
        ]
      }`

    if(isAssembly==1){
      return assemblyconfig;
    }




      const hole_json= `"holes": [
        {
          "holeDiameter": ,
          "position": "",
          "Xvalue": ,
          "Zvalue": 
        }
      ]`

      const pattern_json=`"patterns": [
          {
            "type": "Circular",
            "position": "",
            "numberOfPattern": ,
            "holeSize": ,
            "distancebetweenPattern": ,
            "Zvalue": ,
            "Xvalue": ,
            "length": ,
            "width": ,
            "radius": 
          }
        ]`
     
        const promptf = "Context:"+context+"\n. 1)The image here shows the face profile i.e which face is L1,L2 and L3 along with a few examples of holes and patterns. These are representative examples for reference do not use the exact ones \n2)use the context to identify the need of patterns and holes on each face.\n3)print the result in tabular form where one column is the face{L1,L2 or L3},column 2 is hole or pattern. If we choose hole then one column for hole diameter but if pattern is chosen then mention number of patterns,distance between each element and shape along with radius for circular or length/width if rectangular is chosen all of which can be put in a details column.\n3)Dimensions are:Lengths:"+length1+"and"+length2 +"and"+length3+ " height is"+height
        const imagef = {
        inlineData:{
            data:Buffer.from(fs.readFileSync("bracket/Zf.png")).toString("base64"),
            mimeType:"image/png",
        },
        };
        
        const result_cuts = await model.generateContent([promptf,imagef]);
       const  cuts_table= result_cuts.response.text();
         console.log(cuts_table)


        //const promptL1 = " 1)The image provided shows the profile of face L1 with the maximum length along x  being:"+length1+"and along z being"+ height+"\n2)Use the table provided:"+cuts_table+"to get the positioning of the cutouts or patterns mentioned for L1.Use the exact data from the table only and only for the case of L1. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank . Avoid all cases of overlaps and place them in such a way that all of them are visible on the face and do not go out of bounds.\n3)Patterns are always created vertically and all other measurements are made the way towards +ve Z axis\n4)Response should be in json format: for holes:"+hole_json+"for patterns: "+pattern_json+"the position in all cases is 'L1'\n4)Type Classification: If you want circular patterns fill 'circular' under the type field of the JSON and fill the length and width field with 100.\n5)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2."
        const promptL1 = `1) The image provided shows the profile of face L1.
        - X ranges:0 to ${length1}
        - Z ranges: 0 to ${height}

        2)Use the table provided:${cuts_table}to get the positioning of the cutout holes or patterns mentioned for L1.Use the exact data from the table only and only for the case of L1. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L1'
     
       3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
       
       4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


     5) Ensure patterns stay **fully inside the L1 boundary**:
        - Start point **Xvalue and Zvalue** must be within limits.
        - The last pattern’s position **must not exceed the boundary**:
          - If pattern is 'Circular': 
                 - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                 - Xvalue + 2*holesize  ≤ ${length1}
          - If pattern is 'horizontal rectangle':
            - Xvalue + width  ≤ ${length1}
            - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
          - If pattern is 'vertical rectangle':
            - Xvalue + length  ≤ ${length1}
            - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
     
     6) If patterns **exceed the available space**, adjust automatically:
        - **Reduce numberOfPattern** if necessary.
        - **Decrease distanceBetweenPattern** while maintaining equal spacing.
        - If required, **scale down pattern size proportionally**.
     
     7) Maintain a **minimum margin** of ${5} mm from all edges.
     
     8) Response should be in JSON format:
        for patterns:${pattern_json}
        for holes:${hole_json}
        
     9)Put only values in the json and no intermediate calculations or explanations`;
        const imageL1 = {
        inlineData:{
            data:Buffer.from(fs.readFileSync("bracket/ZL1.png")).toString("base64"),
            mimeType:"image/png",
        },
        };
        
        const result_L1 = await model.generateContent([promptL1,imageL1]);
        const  cuts_L1= result_L1.response.text();
         console.log(cuts_L1)

        


         //const promptL2 = " 1)The image provided shows the profile of face L2 with the maximum length along x  being:"+length2+"and along z being"+ height+"\n2)Use the table provided:"+cuts_table+"to get the positioning of the cutouts or patterns mentioned for L2.Use the exact data from the table only and only for the case of L2. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank . Avoid all cases of overlaps and place them in such a way that all of them are visible on the face and do not go out of bounds.\n3)Patterns are always created vertically and all other measurements are made the way towards +ve Z axis\n4)Response should be in json format: for holes:"+hole_json+"for patterns: "+pattern_json+"the position in all cases is 'L2'\n4)Type Classification: If you want circular patterns fill 'circular' under the type field of the JSON and fill the length and width field with 100.\n5)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2."
         const promptL2 = `1) The image provided shows the profile of face L2.
         - X ranges: 0 to ${length2}
         - Z ranges: 0 to ${height}

         2)Use the table provided:${cuts_table}to get the positioning of the cutout holes or patterns mentioned for L2.Use the exact data from the table only and only for the case of L2. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L2 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L2'
      
        3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
        
        4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


      5) Ensure patterns stay **fully inside the L1 boundary**:
         - Start point **Xvalue and Zvalue** must be within limits.
         - The last pattern’s position **must not exceed the boundary**:
           - If pattern is 'Circular': 
                  - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                  - Xvalue + 2*holesize  ≤ ${length2}
           - If pattern is 'horizontal rectangle':
             - Xvalue + width  ≤ ${length2}
             - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
           - If pattern is 'vertical rectangle':
             - Xvalue + length  ≤ ${length2}
             - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
      
      6) If patterns **exceed the available space**, adjust automatically:
         - **Reduce numberOfPattern** if necessary.
         - **Decrease distanceBetweenPattern** while maintaining equal spacing.
         - If required, **scale down pattern size proportionally**.
      
      7) Maintain a **minimum margin** of ${5} mm from all edges.
      
      8) Response should be in JSON format:
         for patterns:${pattern_json}
         for holes:${hole_json}
         
      9)Put only values in the json and no intermediate calculations or explanations`;
         const imageL2 = {
         inlineData:{
             data:Buffer.from(fs.readFileSync("bracket/ZL2.png")).toString("base64"),
             mimeType:"image/png",
         },
         };
         
         const result_L2 = await model.generateContent([promptL2,imageL2]);
         const  cuts_L2= result_L2.response.text();
          console.log(cuts_L2)


        

         //const promptL3 = " 1)The image provided shows the profile of face L3 with the maximum length along x  being:"+length3+"and along z being"+ height+"\n2)Use the table provided:"+cuts_table+"to get the positioning of the cutouts or patterns mentioned for L3.Use the exact data from the table only and only for the case of L3. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank . Avoid all cases of overlaps and place them in such a way that all of them are visible on the face and do not go out of bounds.\n3)Patterns are always created vertically and all other measurements are made the way towards +ve Z axis\n4)Response should be in json format: for holes:"+hole_json+"for patterns: "+pattern_json+"the position in all cases is 'L3'\n4)Type Classification: If you want circular patterns fill 'circular' under the type field of the JSON and fill the length and width field with 100.\n5)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2."
         const promptL3 = `1) The image provided shows the profile of face L3 .
         - X ranges: 0 to ${length3}
         - Z ranges: 0 to ${height}

         2)Use the table provided:${cuts_table}to get the positioning of the cutout holes or patterns mentioned for L3.Use the exact data from the table only and only for the case of L3. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L3 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L3'
      
        3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
        
        4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


      5) Ensure patterns stay **fully inside the L1 boundary**:
         - Start point **Xvalue and Zvalue** must be within limits.
         - The last pattern’s position **must not exceed the boundary**:
           - If pattern is 'Circular': 
                  - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                  - Xvalue + 2*holesize  ≤ ${length3}
           - If pattern is 'horizontal rectangle':
             - Xvalue + width  ≤ ${length3}
             - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
           - If pattern is 'vertical rectangle':
             - Xvalue + length  ≤ ${length3}
             - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
      
      6) If patterns **exceed the available space**, adjust automatically:
         - **Reduce numberOfPattern** if necessary.
         - **Decrease distanceBetweenPattern** while maintaining equal spacing.
         - If required, **scale down pattern size proportionally**.
      
      7) Maintain a **minimum margin** of ${5} mm from all edges.
      
      8) Response should be in JSON format:
         for patterns:${pattern_json}
         for holes:${hole_json}
         
      9)Put only values in the json and no intermediate calculations or explanations`;
         const imageL3 = {
         inlineData:{
             data:Buffer.from(fs.readFileSync("bracket/ZL3.png")).toString("base64"),
             mimeType:"image/png",
         },
         };
         
         const result_L3 = await model.generateContent([promptL3,imageL3]);
         const  cuts_L3= result_L3.response.text();
          console.log(cuts_L3)

          const finalprompt = "create a sheet metal in the json format as shown"+bracketConfig +"using the following data:\n1)for sizes use this data length1:"+(length1+30)+"length2:"+(length2+30)+"length3:"+(length3+30)+"height:"+(height+60)+"length4 and length5 is always 100\n for L1 holes and patterns STRICTLY USE"+cuts_L1+"\n for L2 Holes and patterns use STRICTLY"+cuts_L2+"\n for L3 holes and patterns use STRICTLY"+cuts_L3+"\n print final json only and no extra text and please NO NULL VALUES"
          const finalJSON=await model.generateContent(finalprompt)
          const fj = finalJSON.response.text()
          const jsonMatch = fj.match(/{[\s\S]*}/);
          return jsonMatch[0];

}

async function  generate_offset_bracket(usable_bracket,context,isAssembly){
  const bracketConfig = `{
      "show2d": true,
      "show3d": true,
      "bracketsType": "Offset Bracket",
      "dimensionType": "",
      "material": "Mild Steel",
      "kfactor": "0.5",
      "bracketDimensions": {
        "length1": ,
        "length2": ,
        "length3": ,
        "length4": ,
        "length5": ,
        "height": ,
        "offSetType": "Inner",
        "thickness": 2
      },
      "holes": [
        {
          "holeDiameter": ,
          "position": "",
          "Xvalue": ,
          "Zvalue": 
        }
      ],
      "patterns": [
        {
          "type": "Circular",
          "position": "",
          "numberOfPattern": 4,
          "holeSize": 5,
          "distancebetweenPattern": 10,
          "Zvalue": 20,
          "Xvalue": 0,
          "length": 10,
          "width": 20,
          "radius": 2
        }
      ]
    }`;      
  
    let dimension_table="";
    const promptb = "Context:"+context+"\n. Task:Using the below image and guidelines provide length1,length2,length3,length4,length5 and height for the"+usable_bracket+ "bracket\n2)Print the result in tabular form and ensure ((length3*2) < length1)\n3)One column for the label and the other for values. Print only the table and the labels should all be in smallcase\n4)provide all values in mm and dont give units along with values\n4)provide all values in mm and dont give units along with values"
    const image = {
    inlineData:{
        data:Buffer.from(fs.readFileSync("bracket/O.png")).toString("base64"),
        mimeType:"image/png",
    },
    };
    
    const resultb = await model.generateContent([promptb,image]);
     dimension_table = resultb.response.text();

    const parsedData = parseTable(dimension_table);
    if (!parsedData || typeof parsedData !== "object") {
      console.error("Error: Failed to parse AI-generated table.");
      return;
  }
  
    console.log(dimension_table)
    

    const length1=parsedData['length1']
    const length2=parsedData['length2']
    const length3=parsedData['length3']
    const length4=parsedData['length4']
    const length5=parsedData['length5']
    const height=parsedData['height']
    
    // Log the extracted values
    console.log(`Length 1: ${length1}`);
    console.log(`Length 2: ${length2}`);
    console.log(`Length 3: ${length2}`);
    console.log(`Length 4: ${length3}`);
    console.log(`Length 5: ${length3}`);
    console.log(`height: ${height}`);


    const assemblyconfig = `{
      "show2d": true,
      "show3d": true,
      "bracketsType": "L Bracket",
      "dimensionType": "Inner Faces",
      "material": "Mild Steel",
      "kfactor": "0.5",
      "bracketDimensions": {
        "length1":${length1} ,
        "length2": ${length2},
        "length3": ${length3},
        "length4": ${length4},
        "length5": ${length5},
        "height": ${height},
        "offSetType": "Inner",
        "thickness": 2
      },
      "holes": [
        {
          "holeDiameter":2 ,
          "position": "L1",
          "Xvalue":0 ,
          "Zvalue": 15
        }
      ],
      "patterns": [
        {
          "type": "Circular",
          "position": "",
          "numberOfPattern": 4,
          "holeSize": 5,
          "distancebetweenPattern": 10,
          "Zvalue": 10,
          "Xvalue": 0,
          "length": 10,
          "width": 20,
          "radius": 2
        }
      ]
    }`

  if(isAssembly==1){
    return assemblyconfig;
  }







    const hole_json= `"holes": [
      {
        "holeDiameter": ,
        "position": "",
        "Xvalue": ,
        "Zvalue": 
      }
    ]`

    const pattern_json=`"patterns": [
        {
          "type": "Circular",
          "position": "",
          "numberOfPattern": ,
          "holeSize": ,
          "distancebetweenPattern": ,
          "Zvalue": ,
          "Xvalue": ,
          "length": ,
          "width": ,
          "radius": 
        }
      ]`
   
      const promptf = "Context:"+context+"\n. 1)The image here shows the face profile i.e which face is L1,L2,L3,L4 and L5 along with a few examples of holes and patterns. These are representative examples for reference do not use the exact ones \n2)use the context to identify the need of patterns and holes on each face.\n3)print the result in tabular form where one column is the face{L1,L2,L3,L4 or L5},column 2 is hole or pattern. If we choose hole then one column for hole diameter but if pattern is chosen then mention number of patterns,distance between each element and shape along with radius for circular or length/width if rectangular is chosen all of which can be put in a details column.\n3)Dimensions are:Lengths:"+length1+"and"+length2 +"and"+length3+"and"+length4+"and"+length5+ " height is"+height
      const imagef = {
      inlineData:{
          data:Buffer.from(fs.readFileSync("bracket/OF.png")).toString("base64"),
          mimeType:"image/png",
      },
      };
      
      const result_cuts = await model.generateContent([promptf,imagef]);
     const  cuts_table= result_cuts.response.text();
       console.log(cuts_table)

      //const promptL1 = " 1)The image provided shows the profile of face L1 with the maximum length along x  being:"+length1+"and along z being"+ height+"\n2)Use the table provided:"+cuts_table+"to get the positioning of the cutouts or patterns mentioned for L1.Use the exact data from the table only and only for the case of L1. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank . Avoid all cases of overlaps and place them in such a way that all of them are visible on the face and do not go out of bounds.\n3)Patterns are always created vertically and all other measurements are made the way towards +ve Z axis\n4)Response should be in json format: for holes:"+hole_json+"for patterns: "+pattern_json+"the position in all cases is 'L1'\n4)Type Classification: If you want circular patterns fill 'circular' under the type field of the JSON and fill the length and width field with 100.\n5)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2."
      const promptL1 = `1) The image provided shows the profile of face L1 .
         - X ranges: 0 to ${length1}
         - Z ranges: 0 to ${height}

         2)Use the table provided:${cuts_table}to get the positioning of the cutout holes or patterns mentioned for L1.Use the exact data from the table only and only for the case of L1. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L1'
      
        3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
        
        4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


      5) Ensure patterns stay **fully inside the L1 boundary**:
         - Start point **Xvalue and Zvalue** must be within limits.
         - The last pattern’s position **must not exceed the boundary**:
           - If pattern is 'Circular': 
                  - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                  - Xvalue + 2*holesize  ≤ ${length1}
           - If pattern is 'horizontal rectangle':
             - Xvalue + width  ≤ ${length1}
             - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
           - If pattern is 'vertical rectangle':
             - Xvalue + length  ≤ ${length1}
             - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
      
      6) If patterns **exceed the available space**, adjust automatically:
         - **Reduce numberOfPattern** if necessary.
         - **Decrease distanceBetweenPattern** while maintaining equal spacing.
         - If required, **scale down pattern size proportionally**.
      
      7) Maintain a **minimum margin** of ${5} mm from all edges.
      
      8) Response should be in JSON format:
         for patterns:${pattern_json}
         for holes:${hole_json}
         
      9)Put only values in the json and no intermediate calculations or explanations`;
      const imageL1 = {
      inlineData:{
          data:Buffer.from(fs.readFileSync("bracket/OL1.png")).toString("base64"),
          mimeType:"image/png",
      },
      };
      
      const result_L1 = await model.generateContent([promptL1,imageL1]);
      const  cuts_L1= result_L1.response.text();
       console.log(cuts_L1)

       //const promptL2 = " 1)The image provided shows the profile of face L2 with the maximum length along x  being:"+length2+"and along z being"+height+"\n2)Use the table provided:"+cuts_table+"to get the positioning of the cutouts or patterns mentioned for L2.Use the exact data from the table only and only for the case of L2. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank . Avoid all cases of overlaps and place them in such a way that all of them are visible on the face and do not go out of bounds.\n3)Patterns are always created vertically and all other measurements are made the way towards +ve Z axis\n4)Response should be in json format: for holes:"+hole_json+"for patterns: "+pattern_json+"the position in all cases is 'L2'\n4)Type Classification: If you want circular patterns fill 'circular' under the type field of the JSON and fill the length and width field with 100.\n5)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2."
       const promptL2 = `1) The image provided shows the profile of face L2 .
         - X ranges: 0 to ${length2}
         - Z ranges: 0 to ${height}

         2)Use the table provided:${cuts_table}to get the positioning of the cutout holes or patterns mentioned for L2.Use the exact data from the table only and only for the case of L2. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L2 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L2'
      
        3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
        
        4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


      5) Ensure patterns stay **fully inside the L1 boundary**:
         - Start point **Xvalue and Zvalue** must be within limits.
         - The last pattern’s position **must not exceed the boundary**:
           - If pattern is 'Circular': 
                  - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                  - Xvalue + 2*holesize  ≤ ${length2}
           - If pattern is 'horizontal rectangle':
             - Xvalue + width  ≤ ${length2}
             - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
           - If pattern is 'vertical rectangle':
             - Xvalue + length  ≤ ${length2}
             - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
      
      6) If patterns **exceed the available space**, adjust automatically:
         - **Reduce numberOfPattern** if necessary.
         - **Decrease distanceBetweenPattern** while maintaining equal spacing.
         - If required, **scale down pattern size proportionally**.
      
      7) Maintain a **minimum margin** of ${5} mm from all edges.
      
      8) Response should be in JSON format:
         for patterns:${pattern_json}
         for holes:${hole_json}
         
      9)Put only values in the json and no intermediate calculations or explanations`;
       const imageL2 = {
       inlineData:{
           data:Buffer.from(fs.readFileSync("bracket/OL2.png")).toString("base64"),
           mimeType:"image/png",
       },
       };
       
       const result_L2 = await model.generateContent([promptL2,imageL2]);
       const  cuts_L2= result_L2.response.text();
        console.log(cuts_L2)

       //const promptL3 = " 1)The image provided shows the profile of face L3 with the maximum length along x  being:"+length3+"and along z being"+ height+"\n2)Use the table provided:"+cuts_table+"to get the positioning of the cutouts or patterns mentioned for L3.Use the exact data from the table only and only for the case of L3. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank . Avoid all cases of overlaps and place them in such a way that all of them are visible on the face and do not go out of bounds.\n3)Patterns are always created vertically and all other measurements are made the way towards +ve Z axis\n4)Response should be in json format: for holes:"+hole_json+"for patterns: "+pattern_json+"the position in all cases is 'L3'\n4)Type Classification: If you want circular patterns fill 'circular' under the type field of the JSON and fill the length and width field with 100.\n5)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2."
       const promptL3 = `1) The image provided shows the profile of face L3 .
         - X ranges: 0 to ${length2}
         - Z ranges: 0 to ${height}

         2)Use the table provided:${cuts_table}to get the positioning of the cutout holes or patterns mentioned for L3.Use the exact data from the table only and only for the case of L3. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L3 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L3'
      
        3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
        
        4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


      5) Ensure patterns stay **fully inside the L1 boundary**:
         - Start point **Xvalue and Zvalue** must be within limits.
         - The last pattern’s position **must not exceed the boundary**:
           - If pattern is 'Circular': 
                  - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                  - Xvalue + 2*holesize  ≤ ${length2}
           - If pattern is 'horizontal rectangle':
             - Xvalue + width  ≤ ${length2}
             - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
           - If pattern is 'vertical rectangle':
             - Xvalue + length  ≤ ${length2}
             - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
      
      6) If patterns **exceed the available space**, adjust automatically:
         - **Reduce numberOfPattern** if necessary.
         - **Decrease distanceBetweenPattern** while maintaining equal spacing.
         - If required, **scale down pattern size proportionally**.
      
      7) Maintain a **minimum margin** of ${5} mm from all edges.
      
      8) Response should be in JSON format:
         for patterns:${pattern_json}
         for holes:${hole_json}
         
      9)Put only values in the json and no intermediate calculations or explanations`;
       const imageL3 = {
       inlineData:{
           data:Buffer.from(fs.readFileSync("bracket/OL3.png")).toString("base64"),
           mimeType:"image/png",
       },
       };
       
       const result_L3 = await model.generateContent([promptL3,imageL3]);
       const  cuts_L3= result_L3.response.text();
        console.log(cuts_L3)

       // const promptL4 = " 1)The image provided shows the profile of face L4 with the maximum length along x  being:"+length4+"and along z being"+ height+"\n2)Use the table provided:"+cuts_table+"to get the positioning of the cutouts or patterns mentioned for L4.Use the exact data from the table only and only for the case of L4. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank . Avoid all cases of overlaps and place them in such a way that all of them are visible on the face and do not go out of bounds.\n3)Patterns are always created vertically and all other measurements are made the way towards +ve Z axis\n4)Response should be in json format: for holes:"+hole_json+"for patterns: "+pattern_json+"the position in all cases is 'L4'\n4)Type Classification: If you want circular patterns fill 'circular' under the type field of the JSON and fill the length and width field with 100.\n5)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2."
       const promptL4 = `1) The image provided shows the profile of face L4 .
       - X ranges: 0 to ${length3}
       - Z ranges: 0 to ${height}

       2)Use the table provided:${cuts_table}to get the positioning of the cutout holes or patterns mentioned for L4.Use the exact data from the table only and only for the case of L4. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L4 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L4'
    
      3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
      
      4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


    5) Ensure patterns stay **fully inside the L1 boundary**:
       - Start point **Xvalue and Zvalue** must be within limits.
       - The last pattern’s position **must not exceed the boundary**:
         - If pattern is 'Circular': 
                - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                - Xvalue + 2*holesize  ≤ ${length3}
         - If pattern is 'horizontal rectangle':
           - Xvalue + width  ≤ ${length3}
           - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
         - If pattern is 'vertical rectangle':
           - Xvalue + length  ≤ ${length3}
           - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
    
    6) If patterns **exceed the available space**, adjust automatically:
       - **Reduce numberOfPattern** if necessary.
       - **Decrease distanceBetweenPattern** while maintaining equal spacing.
       - If required, **scale down pattern size proportionally**.
    
    7) Maintain a **minimum margin** of ${5} mm from all edges.
    
    8) Response should be in JSON format:
       for patterns:${pattern_json}
       for holes:${hole_json}
       
    9)Put only values in the json and no intermediate calculations or explanations`;
       const imageL4 = {
        inlineData:{
            data:Buffer.from(fs.readFileSync("bracket/OL4.png")).toString("base64"),
            mimeType:"image/png",
        },
        };
        
        const result_L4 = await model.generateContent([promptL4,imageL4]);
        const  cuts_L4= result_L4.response.text();
         console.log(cuts_L4)

         //const promptL5 = " 1)The image provided shows the profile of face L5 with the maximum length along x  being:"+length5+"and along z being"+ height+"\n2)Use the table provided:"+cuts_table+"to get the positioning of the cutouts or patterns mentioned for L5.Use the exact data from the table only and only for the case of L5. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L1 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank . Avoid all cases of overlaps and place them in such a way that all of them are visible on the face and do not go out of bounds.\n3)Patterns are always created vertically and all other measurements are made the way towards +ve Z axis\n4)Response should be in json format: for holes:"+hole_json+"for patterns: "+pattern_json+"the position in all cases is 'L5'\n4)Type Classification: If you want circular patterns fill 'circular' under the type field of the JSON and fill the length and width field with 100.\n5)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2."
         const promptL5 = `1) The image provided shows the profile of face L5 .
         - X ranges: 0 to ${length3}
         - Z ranges: 0 to ${height}

         2)Use the table provided:${cuts_table}to get the positioning of the cutout holes or patterns mentioned for L5.Use the exact data from the table only and only for the case of L5. USE THE TABLE DATA ONLY AND ONLY FOR THE FACE L5 DO NOT INCLUDE ANYTHING EXTRA.If no holes or patterns are there leave that part blank.the position in all cases is 'L5'
      
        3)Type Classification: If you want circular patterns fill 'Circular' under the type field of the JSON and fill the length and width field with 100.
        
        4)If you want rectangular patterns arranged length-wise fill the type field with 'horizontal rectangle' in the JSON and fill the radius field with 2.\n6)If you want rectangular patterns arranged width-wise then fill the type field with 'vertical rectangle' and radius with 2.


      5) Ensure patterns stay **fully inside the L1 boundary**:
         - Start point **Xvalue and Zvalue** must be within limits.
         - The last pattern’s position **must not exceed the boundary**:
           - If pattern is 'Circular': 
                  - Zvalue + (numberOfPattern - 1) * ((2*holeSize)+distanceBetweenPattern)  ≤ ${height}.
                  - Xvalue + 2*holesize  ≤ ${length3}
           - If pattern is 'horizontal rectangle':
             - Xvalue + width  ≤ ${length3}
             - Zvalue + (length+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
           - If pattern is 'vertical rectangle':
             - Xvalue + length  ≤ ${length3}
             - Zvalue + (width+ (numberOfPattern - 1)) * distanceBetweenPattern ≤ ${height}
      
      6) If patterns **exceed the available space**, adjust automatically:
         - **Reduce numberOfPattern** if necessary.
         - **Decrease distanceBetweenPattern** while maintaining equal spacing.
         - If required, **scale down pattern size proportionally**.
      
      7) Maintain a **minimum margin** of ${5} mm from all edges.
      
      8) Response should be in JSON format:
         for patterns:${pattern_json}
         for holes:${hole_json}
         
      9)Put only values in the json and no intermediate calculations or explanations`;
         const imageL5 = {
         inlineData:{
             data:Buffer.from(fs.readFileSync("bracket/OL5.png")).toString("base64"),
             mimeType:"image/png",
         },
         };
         
         const result_L5 = await model.generateContent([promptL5,imageL5]);
         const  cuts_L5= result_L5.response.text();
          console.log(cuts_L5)


        const prompt_dimensionType="Context:"+context+"upon analysis suggest a suitable dimension type for the offset. The options are\n1)'Inner Faces' where the flaps go inwards \n2)'Outer Faces where flaps go outwards'"
        const dimensionType_response= await model.generateContent(prompt_dimensionType)
        const dimensionType=dimensionType_response.response.text()
        console.log(dimensionType)
        
        const finalprompt = "create a sheet metal in the json format as shown"+bracketConfig +"using the following data:\n1)for sizes use this data length1:"+(length1+50)+"length2:"+(length2+30)+"length3:"+(length3+24)+"length4:"+(length3+24)+"length5:"+(length3+24)+"height:"+(height+60)+"\n for L1 holes and patterns STRICTLY USE"+cuts_L1+"\n for L2 Holes and patterns use STRICTLY"+cuts_L2+"\n for L3 holes and patterns use STRICTLY"+cuts_L3+"\n for L4 holes and patterns use STRICTLY"+cuts_L4+"\n for L5 holes and patterns use STRICTLY"+cuts_L5+"\n. For filling the 'dimensionType' field use this data:"+ dimensionType+"print final json only and no extra text and please NO NULL VALUES"
        const finalJSON=await model.generateContent(finalprompt)
        const fj = finalJSON.response.text()
          const jsonMatch = fj.match(/{[\s\S]*}/);
          return jsonMatch[0];
}




async function generateContent(context,isAssembly) {

  const sheet_info=`Context:${context}. What kind of bracket will be suitable for our usecase.The options you have:L Bracket,Z Bracket,U Bracket,Offset Bracket.\n2)strictly choose only out of the 4 options above and give only the name no additional characters like stars,colon,apostrophs please`;

const split_res = await model.generateContent(sheet_info)
const sheet_type = split_res.response.text().toString()
let response_json="{}";

console.log(sheet_type)

const validPrefixes = new Set(["L", "U", "Z", "Offset", "T"]);

const matches = [];

const words = sheet_type.split(/\s+/);

for (let i = 0; i < words.length; i++) {
 
  const word = words[i].replace(/[^\w-]/g, ''); 
  
  const hyphenMatch = word.match(/^([A-Z][a-z]*)-bracket$/i); 
  const spaceMatch = word.match(/^([A-Z][a-z]*)$/) && words[i + 1] === "Bracket";

  if (hyphenMatch && validPrefixes.has(hyphenMatch[1])) {
    matches.push(`${hyphenMatch[1]}-bracket`);
  } else if (spaceMatch && validPrefixes.has(word)) {
    matches.push(`${word} Bracket`);
  }
}
  const usable_bracket = matches
console.log(matches[0])

const validBrackets = ["u-bracket", "u bracket"];
if (validBrackets.includes(matches[0].toString().trim().toLowerCase())) {
  response_json= await generate_u_bracket(usable_bracket,context,isAssembly);
}

const validBrackets2 = ["l-bracket", "l bracket"];
if (validBrackets2.includes(matches[0].toString().trim().toLowerCase())) {
  response_json= await generate_l_bracket(usable_bracket,context,isAssembly);
}

const validBrackets3 = ["z-bracket", "z bracket"];
if (validBrackets3.includes(matches[0].toString().trim().toLowerCase())) {
  response_json= await generate_z_bracket(usable_bracket,context,isAssembly);
}

const validBrackets4 = ["offset-bracket", "offset bracket"];
if (validBrackets4.includes(matches[0].toString().trim().toLowerCase())) {
  response_json= await generate_offset_bracket(usable_bracket,context,isAssembly);
}

console.log(response_json)
const output={
  response:response_json,
};
return output;
}


export default generateContent;