const KEY_STORAGE = 'kutsaga.geminiKey'
const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export const BARN_DETECTION_PROMPT = `Analyze this top-down high-resolution satellite image of a rural agricultural area and locate ONLY clear tobacco curing barns and large agricultural barn structures.

Include only structures that are:
- Rectangular or elongated boxy buildings, often in neat rows, clusters, or batteries next to grading sheds and farm tracks.
- Clearly roofed with pitched or gable roofs (corrugated metal, asbestos, or dark weathered roofing) and visible tall-wall shadow edges.
- At least about 8 metres long — do not count small sheds. Box the visible roof footprint only, not its shadow or the surrounding yard.

Strict exclusions (do NOT detect):
- Small circular thatched huts (rondavels), scattered village dwellings, or fenced residential homesteads.
- Small sheds, trees, bushes, water tanks, livestock kraals, vehicles, shadows, bare soil patches, or rectangular patterns that are not buildings.
- Anything you are unsure about. If uncertain, omit it.

Return tight, individual bounding boxes around each separate barn structure — never one box around a whole cluster. Output strictly as a JSON list of objects with:
- box_2d: [y_min, x_min, y_max, x_max] normalized 0-1000
- confidence: "high", "medium", or "low"
- label: "barn"
Return [] if there are no clear barns.`

export const BARN_VERIFY_PROMPT = `Treat the EXACT CENTRE of this image as a pin. Is the object directly under that pin a tobacco curing barn or a large agricultural barn?

Answer true only if the pin lands on a clearly roofed barn building at least about 8 metres long. Answer false for houses, huts, small sheds, tanks, trees, kraals, vehicles, shadows, bare ground, or anything uncertain.

Use confidence "high" only when unmistakable, "medium" when likely, and "low" when uncertain. Low-confidence answers must still set is_barn to false.

Return strictly JSON: {"is_barn": true|false, "reason": "short reason", "confidence": "high"|"medium"|"low"}`

export const getGeminiKey = () => {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export const saveGeminiKey = (key) => {
  const next = key?.trim() ?? ''
  try {
    if (next) localStorage.setItem(KEY_STORAGE, next)
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    /* storage unavailable */
  }
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('kutsaga:geminiKey', { detail: next }))
  }
}

const toImageData = async (imageUrl) => {
  if (imageUrl.startsWith('data:')) {
    const [header, data = ''] = imageUrl.split(',')
    const mimeType = header.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg'
    return { data, mimeType }
  }
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error('Unable to load the image for analysis')
  const blob = await response.blob()
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('Unable to read the image'))
    reader.readAsDataURL(blob)
  })
  return { data, mimeType: blob.type || 'image/jpeg' }
}

const requestJson = async (imageUrl, apiKey, prompt) => {
  if (!apiKey) throw new Error('Add a Gemini API key first')
  if (!imageUrl) throw new Error('No image available to analyze')

  const { data: base64, mimeType } = await toImageData(imageUrl)
  const response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } },
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
  const text =
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
  if (!text) throw new Error('Gemini returned no analysis')

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Gemini returned an invalid JSON response')
  }
}

const normalizeBoxes = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.boxes)) return data.boxes
  if (Array.isArray(data?.detections)) return data.detections
  return []
}

export const analyzeBarnImage = async (imageUrl, apiKey = getGeminiKey()) => {
  const parsed = await requestJson(imageUrl, apiKey, BARN_DETECTION_PROMPT)
  return normalizeBoxes(parsed).filter(
    (item) =>
      Array.isArray(item?.box_2d) &&
      item.box_2d.length === 4 &&
      item.box_2d.every((value) => Number.isFinite(Number(value))) &&
      (!item.label || String(item.label).toLowerCase().includes('barn')) &&
      item.confidence !== 'low',
  )
}

export const verifyBarnAtCenter = async (imageUrl, apiKey = getGeminiKey()) => {
  const parsed = await requestJson(imageUrl, apiKey, BARN_VERIFY_PROMPT)
  const confidence = String(parsed?.confidence ?? 'low').toLowerCase()
  return {
    isBarn: parsed?.is_barn === true && confidence !== 'low',
    reason: typeof parsed?.reason === 'string' ? parsed.reason : '',
    confidence,
  }
}
