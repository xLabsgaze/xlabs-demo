{
  "materials": {
    "cornea": { "Kd": [225, 225, 225], "Ks": [43, 43, 43], "ns": 2048, "map_Kd": "Cornea_col2.jpg", "map_normal": "Cornea_nor.jpg" },
    "cornea.001": { "Kd": [0, 0, 0], "Ks": [43, 43, 43], "ns": 2048, "d": 0.99 },
    "iris": { "Kd": [215, 215, 225], "Ks": [43, 43, 43], "ns": 25, "map_Kd": "Iris_col2.jpg", "map_normal": "Iris_nor.jpg" }
  },
  "decodeParams": {
    "decodeOffsets": [-7861,-7861,-7929,0,0,-511,-511,-511],
    "decodeScales": [0.000126,0.000126,0.000126,0.000978,0.000978,0.001957,0.001957,0.001957]
  },
  "urls": {
    "eye.utf8": [
      { "material": "cornea",
        "attribRange": [0, 2113],
        "codeRange": [16904, 8070, 4032]
      },
      { "material": "cornea.001",
        "attribRange": [24974, 641],
        "codeRange": [30102, 2438, 1216]
      },
      { "material": "iris",
        "attribRange": [32540, 1281],
        "codeRange": [42788, 4995, 2496]
      }
    ]
  }
}