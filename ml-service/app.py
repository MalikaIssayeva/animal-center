from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import torch
import torchvision.transforms as transforms
from torchvision import models
from urllib.request import urlopen
import json

app = FastAPI(title="Animal Center ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = models.resnet18(pretrained=True)
model.eval()

imagenet_classes = json.load(
    urlopen("https://s3.amazonaws.com/deep-learning-models/image-models/imagenet_class_index.json")
)

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

DOG_HINTS = [
    "dog", "chihuahua", "terrier", "pinscher", "retriever", "poodle",
    "bulldog", "beagle", "husky", "spaniel", "shepherd", "corgi",
    "mastiff", "boxer", "dalmatian", "kelpie", "labrador", "malamute",
    "rottweiler", "weimaraner", "great dane", "eskimo dog"
]

CAT_HINTS = [
    "cat", "kitten",
    "tabby", "tiger cat", "striped cat",
    "persian", "siamese", "egyptian", "egyptian cat",
    "lynx",
    "maine coon", "british shorthair", "scottish fold",
    "ragdoll", "bengal", "sphynx", "abyssinian",
    "burmese", "oriental", "savannah",
    "norwegian forest", "devon rex", "cornish rex"
]

BIRD_HINTS = [
    "bird", "parrot", "cockatoo", "macaw", "lorikeet", "canary",
    "eagle", "bald eagle", "kite", "vulture", "owl", "falcon", "hawk",
    "egret", "pelican", "goose", "swan", "duck", "flamingo",
    "grouse", "finch", "bustard", "black grouse", "house finch",
    "coucal", "spoonbill", "bittern"
]

HAMSTER_HINTS = [
    "hamster", "mouse", "rat", "rodent", "guinea pig", "gerbil"
]


def classify_group(label: str) -> str | None:
    label_lower = label.lower().replace("_", " ").replace("-", " ")

    if any(hint in label_lower for hint in DOG_HINTS):
        return "Собака"
    if any(hint in label_lower for hint in CAT_HINTS):
        return "Кошка"
    if any(hint in label_lower for hint in BIRD_HINTS):
        return "Птица"
    if any(hint in label_lower for hint in HAMSTER_HINTS):
        return "Хомяк"

    return None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()

    image = Image.open(io.BytesIO(contents)).convert("RGB")
    input_tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        output = model(input_tensor)

    probabilities = torch.nn.functional.softmax(output[0], dim=0)
    top5 = torch.topk(probabilities, 5)

    alternatives = []
    type_scores = {
        "Собака": 0.0,
        "Кошка": 0.0,
        "Птица": 0.0,
        "Хомяк": 0.0,
    }

    for i in range(5):
        class_id = top5.indices[i].item()
        confidence = float(top5.values[i].item())
        label = imagenet_classes[str(class_id)][1]

        alternatives.append({
            "label": label,
            "confidence": int(confidence * 100)
        })

        detected_group = classify_group(label)
        if detected_group:
            type_scores[detected_group] += confidence

    predicted_type = "Не удалось уверенно определить тип"
    best_type = max(type_scores, key=type_scores.get)
    best_type_score = type_scores[best_type]

    if best_type_score > 0:
        predicted_type = best_type

    top_label_confidence = int(float(top5.values[0].item()) * 100)

    cleaned_alternatives = [
        item for item in alternatives
        if item["confidence"] >= 5
    ]

    if not cleaned_alternatives:
        cleaned_alternatives = alternatives[:3]

    return {
        "predictedType": predicted_type,
        "predictedBreed": alternatives[0]["label"] if alternatives else "Не определено",
        "confidence": top_label_confidence,
        "fileName": file.filename,
        "alternatives": cleaned_alternatives,
    }