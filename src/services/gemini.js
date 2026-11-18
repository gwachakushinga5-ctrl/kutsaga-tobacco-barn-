const KEY_STORAGE = 'kutsaga.geminiKey'
const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export const BARN_DETECTION_PROMPT = `Analyze this top-down high-resolution satellite image of a rural agricultural area and locate all tobacco curing barns and large agricultural barn structures.

Visual cues to include:
- Rectangular or elongated boxy structures, often arranged in neat rows, clusters, or batteries next to grading sheds and farm access tracks.
- Distinct pitched or gable roofs (corrugated metal, asbestos, or dark weathered roofing) with visible shadow edges indicating tall vertical walls.

Strict exclusions (do NOT detect):
- Small circular thatched huts (rondavels), scattered village dwellings, or fenced residential homesteads.
- Trees, bushes, water tanks, livestock kraals, or bare soil patches.

Return tight, individual bounding boxes around each separate barn structure—do not group an entire cluster into one big box. Output strictly as a JSON list of objects with box_2d in [y_min, x_min, y_max, x_max] format (normalized 0-1000) and confidence (high, medium, or low).`

export const getGeminiKey = () => {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export const saveGeminiKey = (key) => {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim())
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    /* storage unavailable */
  }
}

const toBase64 = async (imageUrl) => {
  if (imageUrl.startsWith('data:')) return imageUrl.split(',')[1]
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error('Unable to load the image for analysis')
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('Unable to read the image'))
    reader.readAsDataURL(blob)
  })
}

const normalizeBoxes = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.boxes)) return data.boxes
  if (Array.isArray(data?.detections)) return data.detections
  return []
}

export const analyzeBarnImage = async (imageUrl, apiKey = getGeminiKey()) => {
  if (!apiKey) throw new Error('Add a Gemini API key first')
  if (!imageUrl) throw new Error('No image available to analyze')

  const base64 = await toBase64(imageUrl)
  const response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: BARN_DETECTION_PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    }),
  })

  if (!response.ok) {
    let detail = ''
    try {
      const error = await response.json()
      detail = error?.error?.message ?? ''
    } catch {
      /* non-JSON error */
    }
    throw new Error(detail || `Gemini request failed (${response.status})`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
  if (!text) throw new Error('Gemini returned no analysis')

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Gemini returned an invalid JSON response')
  }

  return normalizeBoxes(parsed).filter(
    (item) => Array.isArray(item?.box_2d) && item.box_2d.length === 4,
  )
}
