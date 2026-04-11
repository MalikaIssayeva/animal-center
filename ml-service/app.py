from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import torch
import torchvision.transforms as transforms
from torchvision import models

app = FastAPI(title="Animal Center ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Загружаем модель
model = models.resnet18(pretrained=True)
model.eval()

# Загружаем классы ImageNet
from urllib.request import urlopen
import json

imagenet_classes = json.load(
    urlopen("https://s3.amazonaws.com/deep-learning-models/image-models/imagenet_class_index.json")
)

# Преобразование
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

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

    # Берём ТОП-5 предсказаний
    probabilities = torch.nn.functional.softmax(output[0], dim=0)
    top5 = torch.topk(probabilities, 5)

    predicted_type = "Неизвестно"
    best_conf = 0

    alternatives = []

    for i in range(5):
        class_id = top5.indices[i].item()
        confidence = top5.values[i].item()

        label = imagenet_classes[str(class_id)][1]

        alternatives.append({
            "label": label,
            "confidence": int(confidence * 100)
        })

        label_lower = label.lower()

        if "dog" in label_lower:
            if confidence > best_conf:
                predicted_type = "Собака"
                best_conf = confidence

        elif "cat" in label_lower:
            if confidence > best_conf:
                predicted_type = "Кошка"
                best_conf = confidence

    # если не нашли — fallback
    if predicted_type == "Неизвестно":
        if "dog" in alternatives[0]["label"].lower():
            predicted_type = "Собака"
        elif "cat" in alternatives[0]["label"].lower():
            predicted_type = "Кошка"

    return {
        "predictedType": predicted_type,
        "predictedBreed": alternatives[0]["label"],
        "ageCategory": "Не определено",
        "healthStatus": "Не определено",
        "confidence": int(best_conf * 100),
        "fileName": file.filename,
        "alternatives": alternatives,
    }