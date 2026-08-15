import os
from PIL import Image

def optimize_images():
    img_dir = r"d:\Atharva\Flask-Folio\static\assets\images"
    for filename in os.listdir(img_dir):
        if filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
            filepath = os.path.join(img_dir, filename)
            try:
                img = Image.open(filepath)
                # WebP output filename
                base_name = os.path.splitext(filename)[0]
                webp_filename = f"{base_name}.webp"
                webp_filepath = os.path.join(img_dir, webp_filename)
                
                # Resize if it's very large
                max_width = 2560
                if img.width > max_width:
                    ratio = max_width / img.width
                    new_height = int(img.height * ratio)
                    img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                
                # Save as WebP
                img.save(webp_filepath, "WEBP", quality=80, method=6)
                print(f"Optimized {filename} -> {webp_filename}")
            except Exception as e:
                print(f"Error optimizing {filename}: {e}")

if __name__ == "__main__":
    optimize_images()
