import sys
import yaml
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from google import genai
import re 

# -----------------------------
# CONFIG
# -----------------------------
API_KEY = "-- placeholder --"
TEMPLATE_FILE = "template.html"
OUTPUT_PDF = "output.pdf"

# -----------------------------
# 1. Read YAML file from args
# -----------------------------
if len(sys.argv) < 2:
    print("Usage: python main.py <resume.yaml>")
    sys.exit(1)

yaml_path = sys.argv[1]

with open(yaml_path, "r") as f:
    resume_yaml = yaml.safe_load(f)

# -----------------------------
# 2. Read Job Description from file
# -----------------------------
if len(sys.argv) < 3:
    print("Usage: python main.py <resume.yaml> <job_description.txt>")
    sys.exit(1)

jd_path = sys.argv[2]

with open(jd_path, "r", encoding="utf-8") as f:
    job_description = f.read().strip()

if not job_description:
    print("❌ Job description file is empty")
    sys.exit(1)


# -----------------------------
# 3. Send YAML + JD to Gemini
# -----------------------------
client = genai.Client(api_key=API_KEY)

prompt = f"""
You are an resume customizer who will make a cherry pick required matter for a given job.

Input:
- Resume data in YAML
- Job Description

Task:
- Optimize the resume for the job description
- Change the Summary as best required by the job description
- Out of the tech skill pick 3 categories which will best reflect for the Job Description and add skill that are missing
- Pick 2-3 projects from the data which will best suite the requirements of the job
- Change the achivements as required by the JD
- 

STRICT RULES:
- Output ONLY raw YAML
- Do NOT use markdown
- Do NOT use ``` or code blocks
- Do NOT add explanations

Resume YAML:
{yaml.dump(resume_yaml, sort_keys=False)}

Job Description:
{job_description}
"""

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt
)

gemini_output = response.text.strip()

# -----------------------------
# 4. Validate Gemini YAML
# -----------------------------
try:
    gemini_output = re.sub(r"^```(?:yaml)?\s*", "", gemini_output)
    gemini_output = re.sub(r"\s*```$", "", gemini_output)
    optimized_yaml = yaml.safe_load(gemini_output)
    if not isinstance(optimized_yaml, dict):
        raise ValueError("Output is not a valid YAML mapping")
except Exception as e:
    print("\n❌ Gemini returned invalid YAML")
    print("Error:", e)
    sys.exit(1)

print("\n✅ Gemini YAML validated successfully")

# -----------------------------
# 5. Render HTML → PDF
# -----------------------------
env = Environment(loader=FileSystemLoader("."))
template = env.get_template(TEMPLATE_FILE)

rendered_html = template.render(**optimized_yaml)

HTML(string=rendered_html, base_url=".").write_pdf(OUTPUT_PDF)

print(f"\n🎉 PDF generated successfully: {OUTPUT_PDF}")
