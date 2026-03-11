from pathlib import Path
from PIL import Image

SOURCE_TIFF = Path('output/etopo1-bedrock-2048x1024.tif')
TARGET_PNG = Path('public/earth-elevation.png')

# NOAA ETOPO1 bedrock export resampled to 2048x1024. Ocean pixels are clamped to 0,
# land pixels are normalized against the maximum positive elevation in the source raster.
def main() -> None:
    with Image.open(SOURCE_TIFF) as image:
        image.load()
        values = list(image.getdata())
        max_positive = max(value for value in values if value > 0)
        normalized = [
            0
            if value <= 0
            else max(1, round((value / max_positive) * 255))
            for value in values
        ]
        heightmap = Image.new('L', image.size)
        heightmap.putdata(normalized)
        heightmap.save(TARGET_PNG, optimize=True)


if __name__ == '__main__':
    main()
