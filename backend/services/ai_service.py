import os
import re
import json
from dotenv import load_dotenv
from openai import OpenAI

TEMPLATE_DIR = "templates"

load_dotenv()

# ----------------------------
# Load OpenRouter API key
# ----------------------------
def get_client():
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
    )

# ----------------------------
# Main function
# ----------------------------
def generate_typst(about, template_id, jd):

    template_file = os.path.join(
        TEMPLATE_DIR,
        f"{template_id}.typ"
    )

    with open(template_file) as f:
        template = f.read()

    client = get_client()

    with open("prompts/generator.txt", "r", encoding="utf-8") as f:
        prompt = f.read()

    if jd == None:
        prompt = prompt + "About: " + about + "Template: " + template
    
    else:
        prompt = prompt + "About: " + about + "Template: " + template + "JD: " + jd


    response = client.chat.completions.create(
        model="openrouter/auto",  
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )

    typst_output = response.choices[0].message.content
    return typst_output


# ----------------------------
# Resume structuring
# ----------------------------
def structure_resume_data(raw_text):

    client = get_client()

    with open("prompts/text_extractor.txt", "r", encoding="utf-8") as f:
        prompt = f.read()

    
    prompt = prompt + "raw_text: " + raw_text

    response = client.chat.completions.create(
        model="openrouter/auto",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    try:
        text = response.choices[0].message.content

        text = re.sub(r"^```json", "", text.strip(), flags=re.IGNORECASE)
        text = re.sub(r"^```", "", text.strip())
        text = re.sub(r"```$", "", text.strip())

        return json.loads(text)

    except Exception as e:
        print("AI parsing failed:", e)

        return {
            "is_resume": False,
            "structured_data": {},
            "warnings": [f"AI parsing failed: {str(e)}"]
        }

def change_typst(change, typst ):
    client = get_client()

    with open("prompts/changer.txt", "r", encoding="utf-8") as f:
        prompt = f.read()

    
    prompt = prompt + "Change: " + change + "typst: " +  typst


    response = client.chat.completions.create(
        model="openrouter/auto",  
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )

    typst_output = response.choices[0].message.content
    return typst_output
