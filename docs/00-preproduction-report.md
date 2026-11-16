# 00 — דוח טרום-הפקה: methodica-gas-uses-01

| | |
|---|---|
| נושא | גזים – תכונות, ניסוי דחיסה ושימושים |
| יעד | 20 |
| מזהה יחידה | `methodica-gas-uses-01` (7 רכיבים: `-01` עד `-07`) |
| כתיבת תוכן | איציק קפטן / רקפת דנאי |
| פיתוח למידה | ענב ששון |
| ריפו | `https://github.com/methodicelElearnig/methodica-gas-uses-01-.git` |
| תאריך דוח | 2026-10-18 |

## מסמכים
- [01-script-extraction.md](01-script-extraction.md): חילוץ מלא כלשונו של 64 השקפים, כולל טקסטים, הדגשות, משובים, רמזים והערות.
- [02-screen-map.md](02-screen-map.md): מיפוי רכיבים, מסכים, תבניות ותשובות, מסלול הלמידה וה-gates.
- [03-open-questions.md](03-open-questions.md): אי-התאמות ושאלות פתוחות לבירור.

## היררכיית מקורות
1. PPTX: תוכן מאושר והתנהגות שמוגדרת במפורש.
2. Figma: עיצוב מאושר.
3. Skills: התנהגות רכיבים, קונבנציות, ניווט וכללי הפקה, במקום שהתסריט לא מגדיר.
4. Learning Journey (`720-templates/references/_learning-journey.md`): מעברים ו-gates.

## מצב סביבה (2026-10-18)
- **תיקייה:** השם תוקן והתו U+200B הוסר. ה-Git מאותחל בשורש התיקייה (ריפו יחיד).
- **Git:**
  - ענף `main`, ללא commits.
  - `origin` = `https://github.com/methodicelElearnig/methodica-gas-uses-01-.git`.
  - זהות מקומית: `Noa <Noat@methodic.co.il>`. ה-git הגלובלי לא שונה.
  - חשבון gh פעיל: `Noa-methodic`, עם הרשאת push.
- **OneDrive:** הפרויקט נשאר בתיקייה מסונכרנת. לא לעבוד במקביל משתי מכונות.

### סקילים (`~/.claude/skills/`)
| סקיל | תיקייה | commit | origin |
|---|---|---|---|
| 720-templates | `720-templates` | `eecddaa` | methodicelElearnig |
| figma-lomda-builder | `figma-lomda-builder` | `d447140` | methodicelElearnig |
| pptx-script-extraction | `pptx-script-extraction` | `500dcd2` | methodicelElearnig |
| 720-design-guidelines | `720-design-guidelines` | `2c388a4` | methodicelElearnig |
| animation-system | `system-animation` | `2804cb9` | methodicelElearnig |
| lomda-qa-publish | `lomda-qa-publish` | `f43de62` | methodicelElearnig |
| responsiveness | `responsiveness` | `5ddbfeb` | methodicelElearnig |
| skill-maintainer | `skill-maintainer` | `ef70348` | methodicelElearnig |

## מבנה תיקיות מתוכנן
```
methodica-gas-uses-01/
├── .gitignore
├── docs/
├── methodica-gas-uses-01-01/   index.html, index_dev.html, css/, js/, assets/{img,video,fonts}, applet/<gas-containers|gas-compression>/
├── methodica-gas-uses-01-02/ … -07/
```

## אבן דרך ראשונה מומלצת
1. שלד רכיב `-01`: canvas, ניווט, Continue/Back, `index_dev.html`, RTL.
2. מסכים 3–4 ו-5–6 מתבניות קיימות.
3. שני היישומונים (שקפים 8–9), שהם הסיכון הגבוה ביותר.

**תנאים מקדימים:**
- תשובות ל-Q-02, Q-03, Q-04, Q-10, Q-18 ו-Q-19.
- קישורי Figma (S-02) ומדיה (S-03).
