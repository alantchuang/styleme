#!/usr/bin/env python3
"""
Copy the 250 StyleMe sample images from the Kaggle fashion dataset.

Usage:
    python3 docs/copy_sample_images.py \
        --images ~/Downloads/fashion-dataset/images \
        --out ~/Downloads/fashion-dataset/styleme-250

The script matches productDisplayName in styles.csv to the 250 names in
convex/seed.ts, then copies {id}.jpg into the output folder.
"""

import argparse
import csv
import re
import shutil
from pathlib import Path

STYLES_CSV = Path(__file__).parent / "styles.csv"

# 250 names taken directly from convex/seed.ts (insertKaggleWardrobe)
SELECTED_NAMES = [
    "Scullers Men Check Blue Shirts",
    "Scullers For Her Women Rivited Check Black Shirts",
    "Sepia Women Blue Printed Top",
    "Do u speak green Men Cream T-shirt",
    "ADIDAS Mens Polo Black Polo T-shirt",
    "Mark Taylor Men Striped Grey Shirt",
    "Proline Men Red T-shirt",
    "Indigo Nation Men Striped Black & Blue T-shirt",
    "Myntra Women's I Know I Am Not Black T-shirt",
    "Basics Men Red Slim Fit Checked Shirt",
    "Locomotive Men Lavender And Grey Check Shirt",
    "Classic Polo Men Printed Navy Blue T-shirt",
    "Scullers Men Scul Red White Shirts",
    "Indigo Nation Men Stripes Black Shirts",
    "Levis Kids Boy's Caspian Black Kidswear",
    "Scullers For Her Women Scarf Shirt Black Tops",
    "Indigo Nation Men Red Polo T-shirt",
    "Mother Earth Women Pink Kurta",
    "Tantra Kid's Unisex Meet My Daddy Red Kidswear",
    "Sepia Women Printed Green Top",
    "Highlander Men Check Blue Shirt",
    "Puma Men Hamburg Graphic Green T-shirt",
    "U.S. Polo Assn. Men Solid Black Sweater",
    "Indigo Nation Men Price catch Blue Shirts",
    "Mumbai Slang Women Printed Green Top",
    "Indigo Nation Men Stripes Purple Shirts",
    "Mark Taylor Men Grey White & Light Brown Striped Shirt",
    "Proline Men Multicoloured Striped Polo T-shirt",
    "Mother Earth Women Blue Kurta",
    "Probase Men Punk Green Tshirts",
    "Wrangler Women Native Lady Pink T-shirt",
    "Wills Lifestyle Women Cream Top",
    "Myntra Men Blue Diet Extreme T-shirt",
    "Little Miss Women Giggles Black T-shirt",
    "Puma Men graphic story tee White Tshirts",
    "Puma Men Generation Black Polo Tshirt",
    "Arrow Woman Yellow Top",
    "Tokyo Talkies Women Printed Orange Top",
    "ADIDAS Men Aess Polo Navy Blue T-shirt",
    "Ed Hardy Men Printed Maroon Tshirts",
    "Nike Women Trainng Grey Tops",
    "Nike Men Organic Red T-shirt",
    "Lee Women Purple Paula Pansy Top",
    "Probase Men's Screw U Green T-shirt",
    "ADIDAS Women Graphic White T-shirt",
    "Indigo Nation Men Price catch Black White Shirts",
    "Indigo Nation Men Checks Blue Shirts",
    "United Colors of Benetton Women Stripes Pink Tops",
    "Puma Men's Record Grey T-shirt",
    "Vishudh Women Blue Printed Kurta",
    "Sushilas Women Printed Green Kurta",
    "Tonga Women Pink & White Top",
    "Indigo Nation Men Check White Shirt",
    "United Colors of Benetton Men Printed Black TShirt",
    "Turtle Men Check Red Shirt",
    "ONLY Women Pink Top",
    "Inkfruit Men's Just bowl It Black T-shirt",
    "Belmonte Men Check Red Shirts",
    "Mark Taylor Beige Printed T-shirt",
    "Shree Women Multicoloured Printed Kurta",
    "Peter England Men Party Blue Jeans",
    "Scullers Men Classic Dark Blue Jeans",
    "Mast & Harbour Men Blue Slim Fit Jeans",
    "Highlander Men Dark Blue Slim Fit Jeans",
    "Pepe Jeans Men Skinny Blue Jeans",
    "Jack & Jones Men Blue Slim Fit Jeans",
    "Wrangler Men Regular Fit Blue Jeans",
    "Flying Machine Men Blue Slim Fit Jeans",
    "Lee Men Mid Blue Regular Fit Jeans",
    "Levis Women Blue 571 Slim Fit Jeans",
    "Indigo Nation Men Khaki Flat Front Formal Trouser",
    "Park Avenue Men Formal Trousers Khaki",
    "Arrow Men Khaki Slim Fit Formal Trousers",
    "Van Heusen Men Beige Formal Trousers",
    "Peter England Men Beige Casual Trousers",
    "Jealous 21 Women Navy Blue Jeans",
    "Jealous 21 Women Light Blue Jeans",
    "Kraus Women Blue Jeans",
    "Loco Motif Women Dark Blue Jeans",
    "Bare Denim Women Blue Jeans",
    "Proline Charcoal Grey Shorts",
    "Adidas Men Black Short",
    "ADIDAS Men Black Training Shorts",
    "Reebok Men Red Shorts",
    "Nike Men Black Shorts",
    "Puma Men Black Shorts",
    "Proline Men Blue Shorts",
    "Numero Uno Men White Casual Shoes",
    "Red Tape Men Casual Black Casual Shoes",
    "Red Tape Men Casual Brown Casual Shoes",
    "Catwalk Women Beige Casual Shoes",
    "Bata Men Black Formal Shoes",
    "Clarks Men Black Formal Shoes",
    "Hush Puppies Men Black Formal Shoes",
    "Lee Cooper Men Black Formal Shoes",
    "Woodland Men Brown Casual Shoes",
    "Woodland Men Tan Casual Shoes",
    "Nike Men Black Running Shoes",
    "Adidas Men Black Running Shoes",
    "Reebok Men Black Running Shoes",
    "Puma Men Black Running Shoes",
    "ADIDAS Men Black Adipure Sports Shoes",
    "Franco Leone Men Brown Sandals",
    "Franco Leone Men Brown Sandals",
    "Catwalk Women Black Heels",
    "Inc 5 Women Black Heels",
    "Mochi Women Black Heels",
    "Catwalk Women Brown Sandals",
    "Inc 5 Women Brown Wedges",
    "United Colors of Benetton Men Short Black Shirts",
    "Jealous 21 Women Light Blue Jeans",
    "United Colors of Benetton Men Check Blue Shirts",
    "Locomotive Men Checks Blue Shirts",
    "Spykar Men Blue Jacket",
    "Jealous 21 Women Black & White Jacket",
    "Jealous 21 Women Navy Blue Jacket",
    "ADIDAS Men Navy Blue Jacket",
    "Nike Men Black Jacket",
    "Puma Men Black Jacket",
    "Reebok Men Navy Blue Jacket",
    "United Colors of Benetton Men Navy Blue Jacket",
    "Highlander Men Navy Blue Jacket",
    "Scullers Men Navy Blue Blazer",
    "Van Heusen Men Blue Blazer",
    "Park Avenue Men Blue Blazer",
    "Arrow Men Blue Blazer",
    "Peter England Men Blue Blazer",
    "Murcia Women Hahk Brown Handbags",
    "Murcia Women Brown Handbags",
    "Lavie Women Brown Handbags",
    "Caprese Women Brown Handbags",
    "Hidesign Women Brown Handbags",
    "Fastrack Men Black Wallets",
    "Tommy Hilfiger Men Black Wallets",
    "Woodland Men Black Wallets",
    "Fossil Men Black Wallets",
    "Levis Men Black Wallets",
    "Arrow Men Black & Brown Reversible Belt",
    "Louis Philippe Men Black Belt",
    "Van Heusen Men Black Belt",
    "Peter England Men Black Belt",
    "Park Avenue Men Black Belt",
    "Titan Men Silver Watch",
    "Titan Men Blue Watch",
    "Fossil Men Silver Watch",
    "Fastrack Men Black Watch",
    "Timex Men Black Watch",
    "Fastrack Women Black Watch",
    "Titan Women Silver Watch",
    "Fossil Women Silver Watch",
    "Titan Women Pink Watch",
    "Timex Women Silver Watch",
    "Fastrack Men Black Sunglasses",
    "Fastrack Men Blue Sunglasses",
    "Rayban Men Black Sunglasses",
    "Oakley Men Black Sunglasses",
    "Tommy Hilfiger Men Black Sunglasses",
    "Fastrack Women Black Sunglasses",
    "Rayban Women Brown Sunglasses",
    "Dior Women Black Sunglasses",
    "Prada Women Black Sunglasses",
    "Gucci Women Gold Sunglasses",
    "Catwalk Women Black Casual Shoes",
    "Inc 5 Women Black Casual Shoes",
    "Mochi Women Black Casual Shoes",
    "Bata Women Black Casual Shoes",
    "Action Women Black Casual Shoes",
    "Catwalk Women Brown Casual Shoes",
    "Inc 5 Women Brown Casual Shoes",
    "Mochi Women Brown Casual Shoes",
    "Bata Women Brown Casual Shoes",
    "Action Women Brown Casual Shoes",
    "Scullers Men Classic Blue Jeans",
    "Scullers Men Dark Wash Blue Jeans",
    "Peter England Men Light Blue Jeans",
    "Highlander Men Light Blue Jeans",
    "Mast & Harbour Men Light Blue Jeans",
    "Scullers For Her Women Blue Printed Tops",
    "Jealous 21 Women Blue Printed Tops",
    "Tokyo Talkies Women Blue Printed Tops",
    "Sepia Women Printed Blue Tops",
    "Wills Lifestyle Women Blue Tops",
    "Bossini Men Blue Check Shirts",
    "Bossini Men Red Check Shirts",
    "Bossini Men Green Check Shirts",
    "Bossini Men Grey Check Shirts",
    "Bossini Men Black Check Shirts",
    "Arrow Woman Blue Top",
    "Arrow Woman Green Top",
    "Arrow Woman White Top",
    "Arrow Woman Red Top",
    "Arrow Woman Black Top",
    "Proline Men Blue T-shirt",
    "Proline Men Green T-shirt",
    "Proline Men Black T-shirt",
    "Proline Men White T-shirt",
    "Proline Men Grey T-shirt",
    "Adidas Men Black Short",
    "Adidas Men Blue Short",
    "Adidas Men Green Short",
    "Adidas Men Red Short",
    "Adidas Men Grey Short",
    "Reebok Men Black Sports Shoes",
    "Reebok Men Blue Sports Shoes",
    "Reebok Men Red Sports Shoes",
    "Reebok Men White Sports Shoes",
    "Reebok Men Grey Sports Shoes",
    "Nike Men Black Sports Shoes",
    "Nike Men Blue Sports Shoes",
    "Nike Men Red Sports Shoes",
    "Nike Men White Sports Shoes",
    "Nike Men Grey Sports Shoes",
    "Puma Men Black Sports Shoes",
    "Puma Men Blue Sports Shoes",
    "Puma Men Red Sports Shoes",
    "Puma Men White Sports Shoes",
    "Puma Men Grey Sports Shoes",
    "Titan Men Black Watch",
    "Titan Men Brown Watch",
    "Fossil Men Black Watch",
    "Fossil Men Blue Watch",
    "Fossil Men Brown Watch",
    "Titan Women Black Watch",
    "Titan Women Brown Watch",
    "Fossil Women Black Watch",
    "Fossil Women Blue Watch",
    "Fossil Women Brown Watch",
    "Fastrack Men Silver Sunglasses",
    "Fastrack Men Brown Sunglasses",
    "Rayban Men Blue Sunglasses",
    "Rayban Men Brown Sunglasses",
    "Oakley Men Blue Sunglasses",
    "Fastrack Women Brown Sunglasses",
    "Rayban Women Black Sunglasses",
    "Dior Women Blue Sunglasses",
    "Prada Women Blue Sunglasses",
    "Gucci Women Black Sunglasses",
    "Murcia Women Black Handbags",
    "Lavie Women Black Handbags",
    "Caprese Women Black Handbags",
    "Hidesign Women Black Handbags",
    "Fastrack Women Brown Handbags",
    "Louis Philippe Men Brown Belt",
    "Van Heusen Men Brown Belt",
    "Peter England Men Brown Belt",
    "Park Avenue Men Brown Belt",
    "Arrow Men Black Belt",
]


def build_name_to_id(csv_path: Path) -> dict[str, str]:
    name_to_id: dict[str, str] = {}
    with csv_path.open(encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name_to_id[row["productDisplayName"].strip()] = row["id"].strip()
    return name_to_id


def main() -> None:
    parser = argparse.ArgumentParser(description="Copy 250 StyleMe sample images")
    parser.add_argument(
        "--images",
        required=True,
        help="Path to folder containing {id}.jpg files from Kaggle dataset",
    )
    parser.add_argument(
        "--out",
        required=True,
        help="Destination folder (created if it doesn't exist)",
    )
    args = parser.parse_args()

    images_dir = Path(args.images).expanduser().resolve()
    out_dir = Path(args.out).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Source : {images_dir}")
    print(f"Output : {out_dir}")
    print(f"Loading styles.csv …")

    name_to_id = build_name_to_id(STYLES_CSV)

    copied = 0
    missing_csv = []
    missing_file = []

    for name in SELECTED_NAMES:
        item_id = name_to_id.get(name)
        if item_id is None:
            missing_csv.append(name)
            continue

        src = images_dir / f"{item_id}.jpg"
        if not src.exists():
            missing_file.append(f"{name} (id={item_id})")
            continue

        dest = out_dir / f"{item_id}.jpg"
        shutil.copy2(src, dest)
        copied += 1

    print(f"\nDone: {copied} images copied to {out_dir}")

    if missing_csv:
        print(f"\n{len(missing_csv)} names not found in styles.csv:")
        for n in missing_csv:
            print(f"  - {n}")

    if missing_file:
        print(f"\n{len(missing_file)} images not found in source folder:")
        for n in missing_file:
            print(f"  - {n}")


if __name__ == "__main__":
    main()
