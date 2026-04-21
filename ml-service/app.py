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
    "mastiff", "boxer", "dalmatian", "kelpie", "labrador"
]

CAT_HINTS = [
    "cat", "kitten", "tabby", "persian", "siamese", "egyptian", "lynx"
]

BIRD_HINTS = [
    "bird", "parrot", "cockatoo", "macaw", "lorikeet", "canary"
]

HAMSTER_HINTS = [
    "hamster", "mouse", "rat", "rodent", "guinea pig", "gerbil"
]


def detect_type_from_label(label: str) -> str:
    label_lower = label.lower()

    if any(hint in label_lower for hint in DOG_HINTS):
        return "Собака"
    if any(hint in label_lower for hint in CAT_HINTS):
        return "Кошка"
    if any(hint in label_lower for hint in BIRD_HINTS):
        return "Птица"
    if any(hint in label_lower for hint in HAMSTER_HINTS):
        return "Хомяк"

    return "Не удалось уверенно определить тип"


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
    predicted_type = "Не удалось уверенно определить тип"
    best_conf = 0

    for i in range(5):
        class_id = top5.indices[i].item()
        confidence = top5.values[i].item()
        label = imagenet_classes[str(class_id)][1]

        alternatives.append({
            "label": label,
            "confidence": int(confidence * 100)
        })

        detected_type = detect_type_from_label(label)
        if detected_type != "Не удалось уверенно определить тип" and confidence > best_conf:
            predicted_type = detected_type
            best_conf = confidence

    if predicted_type == "Не удалось уверенно определить тип" and alternatives:
        fallback_type = detect_type_from_label(alternatives[0]["label"])
        if fallback_type != "Не удалось уверенно определить тип":
            predicted_type = fallback_type
            best_conf = top5.values[0].item()

    return {
        "predictedType": predicted_type,
        "predictedBreed": alternatives[0]["label"] if alternatives else "Не определено",
        "ageCategory": "Не определено",
        "healthStatus": "Не определено",
        "confidence": int(best_conf * 100),
        "fileName": file.filename,
        "alternatives": alternatives,
    }