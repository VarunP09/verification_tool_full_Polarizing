/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CardContent } from "../components/CardContent";

import { database, ref, push } from "../../firebaseConfig";
import { get, runTransaction } from "firebase/database";
import Papa from "papaparse";

/* -----------------------------
   Title formatting
------------------------------ */

function titleCapitalization(title) {
  const titleWords = title.split(" ");
  const conjunctions = ["a", "to", "off", "over", "from", "into", "with", "yet", "so", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "up"];
  for (let i = 0; i < titleWords.length; i++) {
    if (!(conjunctions.includes(titleWords[i].toLowerCase()))) {
      titleWords[i] = titleWords[i].charAt(0).toUpperCase() + titleWords[i].slice(1);
    }
  }
  return titleWords.join(" ");
}

/* -----------------------------
   Dropdown UI
------------------------------ */

const DropdownItem = ({ icon, title, children, openTitle, setOpenTitle, color }) => {
  const isOpen = openTitle === title;
  const handleClick = () => setOpenTitle(isOpen ? null : title);

  const borderColor =
    color === "yellow"
      ? "border-yellow-400"
      : color === "red"
      ? "border-red-400"
      : "border-blue-400";

  return (
    <div
      className={`mb-3 rounded-lg transition-all duration-300 ${
        isOpen
          ? `bg-white/70 ${borderColor} border-l-4 shadow-sm`
          : "hover:bg-gray-50"
      }`}
    >
      <button
        onClick={handleClick}
        className="flex items-center justify-between w-full text-left text-base font-semibold text-gray-900 hover:text-blue-600 focus:outline-none px-2 py-2"
      >
        <span className="flex items-center space-x-2">
          {icon && <span>{icon}</span>}
          <span>{title}</span>
        </span>
        <span
          className={`text-xl leading-none transition-transform duration-300 ${
            isOpen ? "rotate-90 text-blue-500" : "rotate-0 text-gray-500"
          }`}
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="mt-2 ml-3 mr-2 text-left text-gray-800 transition-all duration-300 space-y-2 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
};

/* -----------------------------
   Subcategory Definitions
------------------------------ */

const SUBCATEGORY_DEFINITIONS = {
  "exaggeration":
    "When something is made to sound artificially much bigger, better, or worse than it really is — or the opposite: made to sound smaller or less serious than it actually is.",
  "slogans":
    "A short, memorable phrase used to spark emotion or support a cause. Slogans simplify complex ideas into a few words and can promote unity, nationalism, or other sentiments.",
  "bandwagon":
    "Telling people to support something just because “everyone else” already supports it. This relies on social pressure and popularity, not evidence.",
  "casual oversimplification":
    "Blaming a complex issue on just one cause or explaining it with one simple answer, ignoring other factors that are probably involved.",
  "doubt":
    "Language that tries to make the audience question whether a person, group, or institution is competent, honest, or legitimate.",
  "name-calling":
    "Using a loaded positive or negative label to shape how the audience feels about a person, group, or idea, instead of giving evidence.",
  "demonization":
    "Describing people or groups as evil, dangerous, corrupt, disgusting, or less than human to turn the audience against them.",
  "scapegoating":
    "Blaming an entire group for a broad problem or crisis, framing them as the main cause of widespread harm or decline.",
  "no polarizing language":
    "The paragraph is written in a neutral, factual tone and does not use persuasive propaganda or inflammatory language.",
  "no polarizing language selected":
    "The paragraph is written in a neutral, factual tone and does not use persuasive propaganda or inflammatory language.",
};

const getSubcategoryDefinition = (label) => {
  const key = (label || "").toString().trim().toLowerCase();
  return SUBCATEGORY_DEFINITIONS[key] || "";
};

/* -----------------------------
   Study loading + highlighting helpers
------------------------------ */

const ARTICLE_CSV_PATH = "/article_dataset_versions/fullHitPolarizing.csv";
const ANNOTATIONS_PATH = "/final_annotations.json";
const ARTICLES_PER_PARTICIPANT = 5;
const MAX_PER_ARTICLE = 3;
const EXPECTED_ARTICLE_COUNT = 187;
const ARTICLE_USAGE_NODE = "articleUsagePolarizing";
const COMPLETION_CODE = "CH70G54C";

const AGREEMENT_OPTIONS = [
  "Strongly disagree",
  "Disagree",
  "Somewhat disagree",
  "Neither agree nor disagree",
  "Somewhat agree",
  "Agree",
  "Strongly agree",
];

function isAgreementResponse(value) {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}

function AgreementScale({ name, statement, value, onChange, disabled }) {
  return (
    <fieldset disabled={disabled} className="text-left">
      <legend className="mb-3 font-semibold text-gray-900">
        Now that you have finished reading, please indicate how much you agree or disagree with the following statement:
      </legend>
      <p className="mb-4 italic text-gray-900">{statement}</p>
      <div className="space-y-2">
        {AGREEMENT_OPTIONS.map((label, index) => (
          <label
            key={label}
            className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 text-gray-800"
          >
            <input
              type="radio"
              name={name}
              value={index + 1}
              checked={value === index + 1}
              onChange={() => onChange(index + 1)}
              required
              className="h-4 w-4"
            />
            <span>{index + 1}. {label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const ATTENTION_CHECKS = [
  {
    id: "sport",
    instruction:
      "Sport is not just a leisure activity, it is an essential part of a healthy lifestyle. Engaging in sports helps maintain good physical health and promotes mental well-being. Playing sports not only improves cardiovascular health but also increases muscle strength and coordination. It can also help in maintaining healthy weight and reducing the risk of chronic diseases like diabetes, heart disease, and obesity. Beyond the physical benefits, sports also promote social skills and teamwork, which are crucial life skills. Sports can also help build confidence and self-esteem, as individuals learn to set and achieve goals. It can be a great stress reliever and can help individuals learn to manage their emotions. Additionally, sports can create a sense of community and belonging, bringing people together from diverse backgrounds and cultures. Overall, the importance of sports cannot be overstated, as it promotes a healthy lifestyle and enhances both physical and mental well-being. To show that you read all instructions carefully, please select \"windsurfing\".",
    question: "What is your favourite sport?",
    correctAnswer: "windsurfing",
    options: [
      { value: "football", label: "Football" },
      { value: "basketball", label: "Basketball" },
      { value: "volleyball", label: "Volleyball" },
      { value: "hockey", label: "Hockey" },
      { value: "windsurfing", label: "Windsurfing" },
      { value: "jogging", label: "Jogging" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "drink",
    instruction:
      "Please read this instruction carefully. When asked about your favourite drink, please select \"orange juice\".",
    question:
      "Based on the text you read above, what is your favourite drink?",
    correctAnswer: "orange juice",
    options: [
      { value: "beer", label: "Beer" },
      { value: "wine", label: "Wine" },
      { value: "tea", label: "Tea" },
      { value: "coffee", label: "Coffee" },
      { value: "orange juice", label: "Orange juice" },
      { value: "apple juice", label: "Apple juice" },
    ],
  },
];

/**
 * Returns a new array with the article order randomized.
 * Fisher-Yates ensures every ordering is equally likely.
 * This runs once when the participant's article set loads,
 * so the order remains fixed for the rest of that session.
 */
function shuffleArticles(items) {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function normalizeArticleBody(body) {
  return (body || "")
    .toString()
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n");
}

function getParagraphRanges(body) {
  const paragraphs = body.split("\n");
  const ranges = [];
  let cursor = 0;

  paragraphs.forEach((text, paragraphIndex) => {
    ranges.push({
      paragraphIndex,
      text,
      start: cursor,
      end: cursor + text.length,
    });
    cursor += text.length + 1;
  });

  return ranges;
}

function findAllCaseInsensitiveMatches(body, target) {
  const source = body.toLowerCase();
  const needle = (target || "").toString().toLowerCase();
  const matches = [];

  if (!needle) return matches;

  let fromIndex = 0;
  while (fromIndex < source.length) {
    const start = source.indexOf(needle, fromIndex);
    if (start === -1) break;

    matches.push({
      start,
      end: start + needle.length,
    });

    fromIndex = start + 1;
  }

  return matches;
}

function rangesOverlap(a, b) {
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}


function flattenAnnotationNode(node, inheritedParagraphIndex = null) {
  if (node === null || node === undefined) return [];

  if (Array.isArray(node)) {
    return node.flatMap((item) =>
      flattenAnnotationNode(item, inheritedParagraphIndex)
    );
  }

  if (typeof node !== "object") return [];

  const looksLikeAnnotation =
    "text" in node ||
    "span" in node ||
    "highlight" in node ||
    "highlighted_text" in node ||
    "subcategory" in node ||
    "category" in node;

  if (looksLikeAnnotation) {
    const rawParagraphIndex =
      node.paragraph_index ??
      node.paragraphIndex ??
      inheritedParagraphIndex ??
      0;

    return [
      {
        text:
          node.text ??
          node.span ??
          node.highlight ??
          node.highlighted_text ??
          "",
        category:
          node.category ??
          node.parent_category ??
          node.high_level_category ??
          "",
        subcategory:
          node.subcategory ??
          node.label ??
          node.predicted_subcategory ??
          "",
        paragraph_index: Number(rawParagraphIndex),
      },
    ];
  }

  return Object.entries(node).flatMap(([key, value]) => {
    const nextParagraphIndex =
      /^\d+$/.test(key) ? Number(key) : inheritedParagraphIndex;
    return flattenAnnotationNode(value, nextParagraphIndex);
  });
}

function getAnnotationsForArticle(rawAnnotations, articleIndex, articleTitle) {
  // Filtered CSV indices differ from the original JSON indices. Match by title,
  // never by the subset row number. The supplied JSON is an array of articles.
  if (!Array.isArray(rawAnnotations)) {
    throw new Error("final_annotations.json must contain an array of articles.");
  }

  // The supplied CSV has one known title encoding mismatch. Resolve it only
  // for lookup, preserving the original displayed and saved article title.
  const titleAliases = {
    "gasc‚àö‚â•n strongly considering running for la district attorney job":
      "gascón strongly considering running for la district attorney job",
  };
  const lookupTitle = titleAliases[articleTitle] || articleTitle;
  const matches = rawAnnotations.filter((article) => article?.title === lookupTitle);
  if (matches.length === 0) {
    throw new Error(`No annotations found for article: ${articleTitle}`);
  }

  const annotationLists = matches.map((article) =>
    flattenAnnotationNode(article.annotations)
  );
  // Duplicate titles must have equivalent annotation spans and paragraph labels.
  // Reject conflicting matches instead of silently attaching a different label.
  const signature = (annotations) => JSON.stringify(
    annotations.map((annotation) => [
      annotation.paragraph_index,
      normalizeAnnotationLabel(annotation.category),
      normalizeAnnotationLabel(annotation.subcategory),
      annotation.text,
    ]).sort((a, b) => a[0] - b[0])
  );
  if (annotationLists.some((annotations) =>
    signature(annotations) !== signature(annotationLists[0])
  )) {
    throw new Error(`Conflicting annotations for duplicate title: ${articleTitle}`);
  }
  return annotationLists[0];
}


function normalizeAnnotationLabel(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function isNoPolarizingAnnotation(annotation) {
  const category = normalizeAnnotationLabel(annotation?.category);
  const subcategory = normalizeAnnotationLabel(annotation?.subcategory);
  const text = normalizeAnnotationLabel(annotation?.text);

  return (
    category === "no polarizing language" ||
    subcategory === "no polarizing language" ||
    text === "no polarizing language selected"
  );
}

function prepareStudyArticle(csvRow, articleIndex, rawAnnotations) {
  const title = (csvRow?.["Headline"] || csvRow?.headline || "").toString();
  const body = normalizeArticleBody(
    csvRow?.["News body"] ??
      csvRow?.news_body ??
      csvRow?.body ??
      ""
  );

  const paragraphRanges = getParagraphRanges(body);
  const sourceAnnotations = getAnnotationsForArticle(
    rawAnnotations,
    articleIndex,
    title
  );

  // "No polarizing language" is not treated as a normal span annotation.
  // If it appears alongside any real annotation, simply ignore it.
  const noPolarizingAnnotations = sourceAnnotations.filter(
    isNoPolarizingAnnotation
  );
  const polarizingAnnotations = sourceAnnotations.filter(
    (annotation) => !isNoPolarizingAnnotation(annotation)
  );

  // An article counts as entirely "No Polarizing Language" only when:
  // 1) there are no other annotation categories anywhere in the article, and
  // 2) every non-empty paragraph has a No Polarizing Language annotation.
  const noPolarizingParagraphs = new Set(
    noPolarizingAnnotations.map((annotation) =>
      Number(annotation.paragraph_index ?? 0)
    )
  );
  const nonEmptyParagraphs = paragraphRanges.filter(
    (paragraph) => paragraph.text.trim().length > 0
  );

  const wholeArticleNoPolarizing =
    noPolarizingAnnotations.length > 0 &&
    polarizingAnnotations.length === 0 &&
    nonEmptyParagraphs.length > 0 &&
    nonEmptyParagraphs.every((paragraph) =>
      noPolarizingParagraphs.has(paragraph.paragraphIndex)
    );

  const usedRanges = [];

  const annotations = polarizingAnnotations.map(
    (annotation, annotationIndex) => {
      const annotationText = (annotation.text || "").toString();
      const paragraphIndex = Number(annotation.paragraph_index ?? 0);

      const allMatches = findAllCaseInsensitiveMatches(body, annotationText);
      const requestedParagraph = paragraphRanges.find(
        (paragraph) => paragraph.paragraphIndex === paragraphIndex
      );

      const preferredMatches = requestedParagraph
        ? allMatches.filter(
            (match) =>
              match.start >= requestedParagraph.start &&
              match.end <= requestedParagraph.end
          )
        : [];

      const orderedMatches = [
        ...preferredMatches,
        ...allMatches.filter(
          (match) =>
            !preferredMatches.some(
              (preferred) =>
                preferred.start === match.start &&
                preferred.end === match.end
            )
        ),
      ];

      const unusedMatch = orderedMatches.find(
        (match) => !usedRanges.some((used) => rangesOverlap(match, used))
      );
      const chosenMatch = unusedMatch || orderedMatches[0] || null;

      if (chosenMatch) usedRanges.push(chosenMatch);

      return {
        id: `${articleIndex}-annotation-${annotationIndex}`,
        articleIndex,
        annotationIndex,
        annotationType: "regular",
        paragraphIndex,
        text: annotationText,
        category: (annotation.category || "").toString(),
        subcategory: (annotation.subcategory || "").toString(),
        start: chosenMatch?.start ?? null,
        end: chosenMatch?.end ?? null,
      };
    }
  );

  // For an article that is entirely marked No Polarizing Language, create one
  // article-level verification item. It is intentionally not rendered as a
  // highlight; the user answers the article-level question after reading.
  if (wholeArticleNoPolarizing) {
    annotations.push({
      id: `${articleIndex}-whole-article-no-polarizing`,
      articleIndex,
      annotationIndex: 0,
      annotationType: "regular",
      paragraphIndex: null,
      text: "Entire article",
      category: "No Polarizing Language",
      subcategory: "No Polarizing Language",
      start: null,
      end: null,
      wholeArticleNoPolarizing: true,
    });
  }

  return {
    id: articleIndex,
    title,
    body,
    paragraphRanges,
    regularAnnotationCount: annotations.filter(
      (annotation) => !annotation.wholeArticleNoPolarizing
    ).length,
    falseAnnotationCount: 0,
    annotations,
    wholeArticleNoPolarizing,
  };
}

async function assignRandomArticleIndices(totalArticles) {
  const usageRef = ref(database, ARTICLE_USAGE_NODE);
  let assignedIndices = [];

  const result = await runTransaction(usageRef, (current) => {
    const usage = current ?? {};

    // Ensure Firebase has one counter for every article.
    for (let i = 0; i < totalArticles; i++) {
      if (usage[i] === undefined) usage[i] = 0;
    }

    const available = [];
    for (let i = 0; i < totalArticles; i++) {
      if ((usage[i] ?? 0) < MAX_PER_ARTICLE) {
        available.push(i);
      }
    }

    if (available.length === 0) {
      assignedIndices = [];
      return;
    }

    // Fisher-Yates shuffle, then take up to five distinct available articles.
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    assignedIndices = available.slice(
      0,
      Math.min(ARTICLES_PER_PARTICIPANT, available.length)
    );

    assignedIndices.forEach((index) => {
      usage[index] = (usage[index] ?? 0) + 1;
    });

    return usage;
  });

  if (!result.committed || assignedIndices.length === 0) {
    return [];
  }

  return assignedIndices;
}

/* -----------------------------
   Main Tool (full-study verification)
------------------------------ */

function ToolMain({ prolificId }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showRightInstructions, setShowRightInstructions] = useState(true);

  const [trainingArticles, setTrainingArticles] = useState([]);
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [postTaskConfidence, setPostTaskConfidence] = useState(null);

  const [showAttentionCheck, setShowAttentionCheck] = useState(false);
  const [attentionCheckResponses, setAttentionCheckResponses] = useState({});

  const [hoverTooltip, setHoverTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    category: "",
    subcategory: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAssignedArticles() {
      try {
        setLoading(true);
        setLoadError("");

        const [csvResponse, annotationResponse] = await Promise.all([
          fetch(ARTICLE_CSV_PATH),
          fetch(ANNOTATIONS_PATH),
        ]);

        if (!csvResponse.ok) {
          throw new Error(
            `Could not load ${ARTICLE_CSV_PATH} (HTTP ${csvResponse.status}).`
          );
        }

        if (!annotationResponse.ok) {
          throw new Error(
            `Could not load ${ANNOTATIONS_PATH} (HTTP ${annotationResponse.status}).`
          );
        }

        const [csvText, rawAnnotations] = await Promise.all([
          csvResponse.text(),
          annotationResponse.json(),
        ]);

        const csvRows = await new Promise((resolve, reject) => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors?.length) {
                console.warn("CSV parse warnings:", results.errors);
              }
              resolve(results.data || []);
            },
            error: reject,
          });
        });

        if (csvRows.length === 0) {
          throw new Error("The article CSV does not contain any articles.");
        }

        if (csvRows.length !== EXPECTED_ARTICLE_COUNT) {
          throw new Error(
            `Expected ${EXPECTED_ARTICLE_COUNT} articles in fullHitPolarizing.csv, but loaded ${csvRows.length}.`
          );
        }

        // Validate the polarizing-only dataset before reserving assignment counters.
        const eligibleArticles = csvRows.map((row, index) =>
          prepareStudyArticle(row, index, rawAnnotations)
        );
        const invalidArticle = eligibleArticles.find(
          (article) => !article.annotations.some(
            (annotation) => !isNoPolarizingAnnotation(annotation)
          )
        );
        if (invalidArticle) {
          throw new Error(
            `Article has no polarizing annotations: ${invalidArticle.title}`
          );
        }
        // An effect cancelled during loading must not reserve articles.
        if (cancelled) return;

        // Polarizing counters use subset indices, separate from the NP/original sets.
        const assignedIndices = await assignRandomArticleIndices(csvRows.length);
        if (assignedIndices.length === 0) {
          throw new Error("This task is full");
        }
        const preparedArticles = assignedIndices.map((index) => eligibleArticles[index]);

        if (!cancelled) {
          // Keep the randomized assignment order returned by Firebase.
          setTrainingArticles(preparedArticles);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error?.message ||
              "The study articles could not be loaded. Please refresh and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAssignedArticles();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentArticle = trainingArticles[currentArticleIndex] || null;
  const totalReviewAnnotations = trainingArticles.reduce(
    (sum, article) => sum + article.annotations.length,
    0
  );
  const answeredCount = Object.keys(responses).length;

  const selectedAnnotation =
    currentArticle?.annotations.find(
      (annotation) => annotation.id === selectedAnnotationId
    ) || null;

  const currentArticleComplete =
    !!currentArticle &&
    currentArticle.annotations.every((annotation) => responses[annotation.id]);

  const currentArticleAnsweredCount = currentArticle
    ? currentArticle.annotations.filter((annotation) => responses[annotation.id])
        .length
    : 0;

  const bothArticleQuestionsAnswered = ATTENTION_CHECKS.every(
    (check) => !!attentionCheckResponses[check.id]
  );

  function openAnnotation(annotation) {
    if (responses[annotation.id]) return;

    setHoverTooltip((previous) => ({
      ...previous,
      visible: false,
    }));
    setSelectedAnnotationId(annotation.id);
  }

  function submitVote(decision) {
    if (!selectedAnnotation || responses[selectedAnnotation.id]) return;

    setResponses((previous) => ({
      ...previous,
      [selectedAnnotation.id]: decision,
    }));

    setSelectedAnnotationId(null);
    setHoverTooltip((previous) => ({
      ...previous,
      visible: false,
    }));
  }

  function getHighlightClass(annotation) {
    const response = responses[annotation.id];

    if (response === "agree") {
      return "bg-green-200 ring-1 ring-green-400 cursor-not-allowed";
    }

    if (response === "disagree") {
      return "bg-red-200 ring-1 ring-red-400 cursor-not-allowed";
    }

    return "bg-yellow-200 hover:bg-yellow-300 cursor-pointer";
  }

  function renderHighlight(annotation, visibleText) {
    const answered = !!responses[annotation.id];
    const tooltipCategory = annotation.category || "Unknown category";
    const tooltipSubcategory =
      annotation.subcategory || "Unknown subcategory";

    const handleMouseEnter = (event) => {
      if (answered) return;

      setHoverTooltip({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        category: tooltipCategory,
        subcategory: tooltipSubcategory,
      });
    };

    const handleMouseMove = (event) => {
      if (answered) return;

      setHoverTooltip((previous) =>
        previous.visible
          ? {
              ...previous,
              x: event.clientX,
              y: event.clientY,
            }
          : previous
      );
    };

    const handleMouseLeave = () => {
      setHoverTooltip((previous) => ({
        ...previous,
        visible: false,
      }));
    };

    return (
      <span
        key={annotation.id}
        className={`${getHighlightClass(
          annotation
        )} rounded-sm px-0.5 transition-colors`}
        onClick={() => openAnnotation(annotation)}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={answered ? -1 : 0}
        onKeyDown={(event) => {
          if (!answered && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            openAnnotation(annotation);
          }
        }}
        aria-disabled={answered}
        title={
          answered
            ? `Answered: ${responses[annotation.id]}`
            : `${tooltipCategory}: ${tooltipSubcategory}`
        }
      >
        {visibleText}
      </span>
    );
  }

  function renderParagraph(paragraph) {
    if (!currentArticle) return null;

    const paragraphAnnotations = currentArticle.annotations
      .filter(
        (annotation) =>
          annotation.start !== null &&
          annotation.end !== null &&
          annotation.start >= paragraph.start &&
          annotation.end <= paragraph.end
      )
      .sort((a, b) => a.start - b.start || a.end - b.end);

    const pieces = [];
    let cursor = paragraph.start;

    paragraphAnnotations.forEach((annotation) => {
      if (annotation.start < cursor) return;

      if (annotation.start > cursor) {
        pieces.push(
          <React.Fragment key={`text-${paragraph.paragraphIndex}-${cursor}`}>
            {currentArticle.body.slice(cursor, annotation.start)}
          </React.Fragment>
        );
      }

      pieces.push(
        renderHighlight(
          annotation,
          currentArticle.body.slice(annotation.start, annotation.end)
        )
      );

      cursor = annotation.end;
    });

    if (cursor < paragraph.end) {
      pieces.push(
        <React.Fragment key={`text-${paragraph.paragraphIndex}-${cursor}-end`}>
          {currentArticle.body.slice(cursor, paragraph.end)}
        </React.Fragment>
      );
    }

    return (
      <p
        key={`paragraph-${paragraph.paragraphIndex}`}
        className="text-gray-700 mb-5 text-left leading-8 text-lg"
      >
        {pieces}
      </p>
    );
  }

  function buildResponseDetails(responseMap) {
    return trainingArticles.flatMap((article) =>
      article.annotations
        .filter((annotation) => !!responseMap[annotation.id])
        .map((annotation) => {
          const response = responseMap[annotation.id];
          return {
            articleIndex: article.id,
            articleTitle: article.title,
            annotationIndex: annotation.annotationIndex,
            annotationType: annotation.annotationType,
            paragraphIndex: annotation.paragraphIndex,
            text: annotation.text,
            category: annotation.category,
            subcategory: annotation.subcategory,
            response,
            ...(annotation.wholeArticleNoPolarizing
              ? {
                  responseType: "likert_1_7",
                  responseLabel: AGREEMENT_OPTIONS[response - 1],
                  wholeArticleNoPolarizing: true,
                  statement: "This passage contains no polarizing language.",
                }
              : {}),
          };
        })
    );
  }

  function handleAttentionCheckAnswer(question, selectedAnswer) {
    if (submitting || result) return;

    setAttentionCheckResponses((previous) => ({
      ...previous,
      [question.id]: selectedAnswer,
    }));
    setSubmitError("");
  }

  function submitArticleQuestions() {
    if (!bothArticleQuestionsAnswered) {
      setSubmitError("Please answer both questions before continuing.");
      return;
    }

    // Record attention-check answers with the final submission; this full HIT
    // has no qualification score or early pass/fail screen.
    setShowAttentionCheck(false);
    setSubmitError("");
    setCurrentArticleIndex((previous) => previous + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finishTask() {
    if (submitting) return;
    if (!prolificId.trim()) {
      setSubmitError("Please enter your Prolific ID before submitting.");
      return;
    }
    if (!currentArticleComplete || answeredCount !== totalReviewAnnotations) {
      setSubmitError(
        "Please answer every article response before submitting the task."
      );
      return;
    }

    if (!isAgreementResponse(postTaskConfidence)) {
      setSubmitError("Please answer the final confidence question before submitting.");
      return;
    }

    const responseDetails = buildResponseDetails(responses);

    try {
      setSubmitting(true);
      setSubmitError("");

      await push(ref(database, "fullHitSubmissions"), {
        prolificId: prolificId.trim(),
        totalAnnotationsReviewed: totalReviewAnnotations,
        attentionCheckResponses,
        completionCode: COMPLETION_CODE,
        articleDataset: "fullHitPolarizing.csv",
        articlePresentationOrder: trainingArticles.map((article, position) => ({
          position: position + 1,
          articleIndex: article.id,
          articleTitle: article.title,
        })),
        responses: responseDetails,
        surveyResponses: {
          postTaskConfidence,
          postTaskConfidenceLabel: AGREEMENT_OPTIONS[postTaskConfidence - 1],
          postTaskConfidenceStatement:
            "I am confident in my ability to accurately identify persuasive, emotionally charged, or inflammatory language in news articles.",
        },
        timestamp: Date.now(),
      });

      setResult({ completed: true });
    } catch (error) {
      setSubmitError(
        "Your answers could not be saved. Please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function goToNextArticle() {
    if (!currentArticleComplete) {
      setSubmitError(
        "Please answer every highlighted annotation in this article before continuing."
      );
      return;
    }

    setSubmitError("");
    setSelectedAnnotationId(null);

    if (
      currentArticleIndex === 1 &&
      trainingArticles.length > 2 &&
      !showAttentionCheck
    ) {
      setShowAttentionCheck(true);
      window.setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth",
        });
      }, 0);
      return;
    }

    if (currentArticleIndex < trainingArticles.length - 1) {
      setCurrentArticleIndex((previous) => previous + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    finishTask();
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Loading Articles
          </h1>
          <p className="text-gray-600">
            Please wait while the articles and annotations are prepared.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-2xl bg-white rounded-xl shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-red-700 mb-3">
            Study Articles Could Not Be Loaded
          </h1>
          <p className="text-gray-700 mb-4">{loadError}</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-2xl bg-white rounded-xl shadow p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Thank you for completing this task!
          </h1>
          <button
            type="button"
            onClick={() =>
              window.location.assign(
                `https://app.prolific.com/submissions/complete?cc=${COMPLETION_CODE}`
              )
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
          >
            Return to Prolific
          </button>
        </div>
      </div>
    );
  }

  const unmatchedAnnotations =
    currentArticle?.annotations.filter(
      (annotation) =>
        !annotation.wholeArticleNoPolarizing &&
        (annotation.start === null || annotation.end === null)
    ) || [];

  return (
    <div className="flex w-full justify-center items-start min-h-screen bg-gray-100 relative">

{/* Instructions Sidebar (ORIGINAL) */}
      <div
        className={`w-1/4 p-4 bg-gray-200 shadow-md transition-all duration-300 ${
          showRightInstructions
            ? "visible opacity-100 pointer-events-auto"
            : "invisible opacity-0 pointer-events-none"
        }`}
      >
        <h3 className="text-lg font-bold mb-2">Annotation Guide</h3>
        <p className="text-sm mb-2">Use the following categories for labeling:</p>

        {/* Persuasive Propaganda Section */}
        <div className="bg-yellow-100 p-4 rounded mb-4">
          <strong className="text-yellow-700 text-center block mb-4 text-lg font-semibold">
            Persuasive Propaganda
          </strong>

          <DropdownItem
            title="Exaggeration"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="yellow"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                When something is made to sound artificially much bigger, better,
                or worse than it really is — or, the opposite, made to sound
                smaller or less serious than it actually is.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>
                    “A local protest ignited waves of outrage and sent shockwaves
                    through the nation.”
                  </li>
                  <li>
                    “This minor disagreement has become a national catastrophe,
                    easily the worst of the modern era.”
                  </li>
                  <li>
                    “The present scandal is nothing — just political theater —
                    and most Americans aren’t even aware of it.”
                  </li>
                </ul>
              </div>
            </div>
          </DropdownItem>

          <DropdownItem
            title="Slogans"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="yellow"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                A short, memorable phrase used to spark emotion or support a
                cause. Slogans simplify complex ideas into a few words and can
                promote unity, nationalism, or other sentiments. They can be
                positive or negative in tone.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>“Make America Great Again” / “America First”</li>
                  <li>“No Justice, No Peace”</li>
                  <li>“Occupy Wall Street — We Are the 99%”</li>
                </ul>
              </div>
            </div>
          </DropdownItem>

          <DropdownItem
            title="Bandwagon"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="yellow"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                When people are told to support something just because “everyone
                else” already supports it. The message is: if many others believe
                it, you should too. This relies on social pressure and
                popularity, not evidence.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>“Most Americans back this plan, polls show.”</li>
                  <li>
                    “As the Senator emphasized, ‘every true Republican supports
                    this cause.’”
                  </li>
                  <li>
                    “No serious economist still believes raising taxes is a good
                    idea.”
                  </li>
                </ul>
              </div>
            </div>
          </DropdownItem>

          <DropdownItem
            title="Casual Oversimplification"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="yellow"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                When a complex issue is blamed on just one cause or explained
                with one simple answer, ignoring all the other factors that are
                probably involved.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>“The media is the only reason the nation is divided.”</li>
                  <li>
                    “Inflation rose solely because of the president’s policies.”
                  </li>
                  <li>“Crime is up because of progressive prosecutors.”</li>
                </ul>
              </div>
            </div>
          </DropdownItem>

          <DropdownItem
            title="Doubt"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="yellow"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                Language that tries to make the audience question whether a
                person, group, or institution is competent, honest, or
                legitimate.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>“Is he really ready to be the Mayor?”</li>
                  <li>“Is this leader even capable of running the country?”</li>
                  <li>
                    “Some experts question whether the agency’s data can be
                    trusted.”
                  </li>
                </ul>
              </div>
            </div>
          </DropdownItem>
        </div>

        {/* Inflammatory Language Section */}
        <div className="bg-red-100 p-4 rounded mb-6">
          <strong className="text-red-700 text-center block mb-4 text-lg font-semibold">
            Inflammatory Language
          </strong>

          <DropdownItem
            title="Name-Calling"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="red"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                Using a loaded positive or negative label to shape how the
                audience feels about a person, group, or idea. Instead of giving
                evidence, the speaker uses emotionally charged wording to
                discredit or glorify.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>
                    “The movement, composed largely of radical extremists, has
                    demanded sweeping reform.”
                  </li>
                  <li>“Big-money interests continue to profit during the crisis.”</li>
                  <li>
                    “The oft-labeled terrorist sympathizers took to the streets
                    in the latest wave of protests.”
                  </li>
                </ul>
              </div>
            </div>
          </DropdownItem>

          <DropdownItem
            title="Demonization"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="red"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                Describing people or groups as evil, dangerous, corrupt,
                disgusting, or less than human. The goal is to turn the audience
                against the target by making them sound like a threat to
                society.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>“The nation’s bureaucrats are bleeding taxpayers dry.”</li>
                  <li>“Migrants are parasites stealing American jobs.”</li>
                  <li>
                    “These politicians are eating away at the heart of this
                    nation from within.”
                  </li>
                </ul>
              </div>
            </div>
          </DropdownItem>

          <DropdownItem
            title="Scapegoating"
            openTitle={openDropdown}
            setOpenTitle={setOpenDropdown}
            color="red"
          >
            <div className="mt-2 ml-4 text-left text-gray-800 space-y-2 py-3">
              <p className="text-base leading-relaxed">
                Blaming an entire group for a broad problem or crisis. The group
                is framed as the main cause of widespread harm or decline. This
                is almost always aimed at groups (not individuals) and links
                them to larger social, economic, or moral problems.
              </p>
              <div className="text-sm leading-relaxed text-gray-700">
                <p className="font-semibold">Examples:</p>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>
                    “The rising rents — driven as always by greedy landlords —
                    represent a severe strain on families.”
                  </li>
                  <li>
                    “Teachers’ unions are the reason kids are failing in school.”
                  </li>
                  <li>
                    “Homelessness continues to rise because city officials refuse
                    to enforce basic laws.”
                  </li>
                </ul>
              </div>
            </div>
          </DropdownItem>
        </div>

        <Button
          onClick={() => setShowRightInstructions(false)}
          className="bg-gray-600 text-white w-full"
        >
          Close Guide
        </Button>
      </div>

{/* Main Content */}
      <div className="flex-1 max-w-5xl bg-white p-6 rounded-lg shadow-md text-center">
        <Button
          onClick={() => setShowRightInstructions(!showRightInstructions)}
          className="bg-blue-600 text-white mb-4"
        >
          {showRightInstructions ? "Hide Instructions" : "Show Instructions"}
        </Button>

        <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-gray-900">
              Article {currentArticleIndex + 1} of {trainingArticles.length}
            </p>
            <p className="text-sm text-gray-700">
              Overall progress: {answeredCount} of {totalReviewAnnotations} annotations
              answered
            </p>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{
                width: `${
                  totalReviewAnnotations > 0
                    ? (answeredCount / totalReviewAnnotations) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {currentArticle && (
          <Card>
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              {titleCapitalization(currentArticle.title)}
            </h2>

            <CardContent>
              <div className="article-body">
                {currentArticle.paragraphRanges.map(renderParagraph)}
              </div>

              {currentArticle.wholeArticleNoPolarizing &&
                currentArticle.annotations.find(
                  (annotation) => annotation.wholeArticleNoPolarizing
                ) && (() => {
                  const noPolarizingAnnotation = currentArticle.annotations.find(
                    (annotation) => annotation.wholeArticleNoPolarizing
                  );
                  const existingResponse = responses[noPolarizingAnnotation.id];

                  return (
                    <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
                      <AgreementScale
                        name={`no-polarizing-${currentArticle.id}`}
                        statement="This passage contains no polarizing language."
                        value={existingResponse}
                        onChange={(value) =>
                          setResponses((previous) => ({
                            ...previous,
                            [noPolarizingAnnotation.id]: value,
                          }))
                        }
                        disabled={submitting}
                      />
                    </div>
                  );
                })()}

              {unmatchedAnnotations.length > 0 && (
                <div className="mt-6 rounded-lg border border-orange-300 bg-orange-50 p-4 text-left">
                  <p className="font-semibold text-orange-900 mb-2">
                    Annotation text matching warning
                  </p>
                  <p className="text-sm text-orange-800 mb-3">
                    The following annotation text could not be matched
                    automatically in the article. Review each item directly so
                    the task can still be completed.
                  </p>

                  <div className="space-y-2">
                    {unmatchedAnnotations.map((annotation) => (
                      <button
                        key={`unmatched-${annotation.id}`}
                        type="button"
                        disabled={!!responses[annotation.id]}
                        onClick={() => openAnnotation(annotation)}
                        className={`w-full rounded border p-3 text-left text-sm ${
                          responses[annotation.id]
                            ? "border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                            : "border-orange-300 bg-white text-gray-800 hover:bg-orange-100"
                        }`}
                      >
                        “{annotation.text}”
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 border-t border-gray-200 pt-5">
                <p className="text-sm text-gray-600 mb-3">
                  This article: {currentArticleAnsweredCount} of{" "}
                  {currentArticle.annotations.length} annotations answered
                </p>

                {currentArticleIndex === trainingArticles.length - 1 &&
                  currentArticleComplete && answeredCount === totalReviewAnnotations && (
                    <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
                      <AgreementScale
                        name="post-task-confidence"
                        statement="I am confident in my ability to accurately identify persuasive, emotionally charged, or inflammatory language in news articles."
                        value={postTaskConfidence}
                        onChange={(value) => {
                          setPostTaskConfidence(value);
                          setSubmitError("");
                        }}
                        disabled={submitting}
                      />
                    </div>
                  )}

                {submitError && (
                  <p className="mb-3 text-sm font-semibold text-red-600">
                    {submitError}
                  </p>
                )}

                {showAttentionCheck && currentArticleIndex === 1 ? (
                  <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 text-left">
                    <h3 className="mb-2 text-xl font-bold text-gray-900">
                      Please answer the following questions
                    </h3>
                    <p className="mb-6 text-sm text-gray-600">
                      Select one response for each question, then click Continue.
                    </p>

                    <div className="space-y-8">
                      {ATTENTION_CHECKS.map((check) => (
                        <section
                          key={check.id}
                          className="rounded-lg border border-gray-200 bg-white p-5"
                        >
                          <p className="mb-4 text-base leading-7 text-gray-800">
                            <span className="font-bold">*</span>
                            {check.instruction}
                          </p>

                          <h4 className="mb-4 text-lg font-bold text-gray-900">
                            {check.question}
                          </h4>

                          <div className="space-y-2">
                            {check.options.map((option) => (
                              <label
                                key={`${check.id}-${option.value}`}
                                className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 px-4 py-3 text-gray-800 hover:bg-gray-50"
                              >
                                <input
                                  type="radio"
                                  name={`article-question-${check.id}`}
                                  value={option.value}
                                  checked={
                                    attentionCheckResponses[check.id] ===
                                    option.value
                                  }
                                  onChange={() =>
                                    handleAttentionCheckAnswer(
                                      check,
                                      option.value
                                    )
                                  }
                                  disabled={submitting}
                                  className="h-4 w-4"
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>

                    <div className="mt-6 flex justify-center">
                      <Button
                        onClick={submitArticleQuestions}
                        disabled={!bothArticleQuestionsAnswered || submitting}
                        className={
                          bothArticleQuestionsAnswered && !submitting
                            ? "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
                            : "bg-gray-400 text-white px-6 py-2 rounded cursor-not-allowed"
                        }
                      >
                        {submitting ? "Saving..." : "Continue"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={goToNextArticle}
                    disabled={
                      !currentArticleComplete || submitting ||
                      (currentArticleIndex === trainingArticles.length - 1 &&
                        !isAgreementResponse(postTaskConfidence))
                    }
                    className={
                      currentArticleComplete && !submitting &&
                      (currentArticleIndex < trainingArticles.length - 1 ||
                        isAgreementResponse(postTaskConfidence))
                        ? "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
                        : "bg-gray-400 text-white px-6 py-2 rounded cursor-not-allowed"
                    }
                  >
                    {submitting
                      ? "Saving..."
                      : currentArticleIndex < trainingArticles.length - 1
                      ? "Next Article"
                      : "Submit"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Annotation Popup */}
        {selectedAnnotation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center animate-fadeIn">
              <h2 className="text-2xl font-bold mb-3 text-gray-900">
                Verify Annotation
              </h2>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-left mb-4">
                <p className="text-xs text-gray-500 mb-1 font-semibold">
                  Highlighted text
                </p>
                <p className="text-sm text-gray-800 break-words">
                  “{selectedAnnotation.text}”
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 text-left mb-5">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    Category
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedAnnotation.category}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    Subcategory
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedAnnotation.subcategory}
                  </p>
                </div>
              </div>

              {getSubcategoryDefinition(selectedAnnotation.subcategory) && (
                <div className="border border-gray-200 rounded-lg p-4 text-left mb-5 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1 font-semibold">
                    Definition of {selectedAnnotation.subcategory}
                  </p>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {getSubcategoryDefinition(
                      selectedAnnotation.subcategory
                    )}
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-700 mb-6 leading-relaxed">
                Do you agree that the highlighted text belongs to the category
                and subcategory shown above?
              </p>

              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => submitVote("disagree")}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                  Disagree
                </Button>

                <Button
                  onClick={() => submitVote("agree")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
                >
                  Agree
                </Button>
              </div>

              <div className="mt-3 flex justify-center">
                <Button
                  onClick={() => setSelectedAnnotationId(null)}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs"
                >
                  Back to article
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions Panel on Right */}
      <div
        className={`w-1/4 p-4 transition-all duration-300 ${
          showRightInstructions
            ? "visible opacity-100 pointer-events-auto"
            : "invisible opacity-0 pointer-events-none"
        }`}
      >
        <h3 className="text-lg font-bold mb-3">Instructions</h3>

        <p className="text-sm ml-3 text-left">
          You will review the annotations in your assigned articles.
        </p>

        <div className="h-4" />

        <ol className="list-decimal text-left ml-5 list-inside text-sm space-y-3">
          <li>
            Read the <strong>entire article</strong> shown on the screen.
          </li>
          <li>
            Click each <strong>yellow highlighted passage</strong> to view its
            category and subcategory.
          </li>
          <li>
            Choose <strong>Agree</strong> when the annotation is correct or{" "}
            <strong>Disagree</strong> when it is not.
          </li>
          <li>
            After every highlight in the article has been answered, continue to
            the next article.
          </li>
          <li>
            Some proposed annotations may be incorrect, so evaluate each one
            carefully rather than agreeing automatically.
          </li>
        </ol>

        <div className="h-4" />

        <div className="rounded-lg border border-gray-200 bg-white p-3 text-left text-xs text-gray-600">
          <p className="mb-1">
            <span className="inline-block w-4 h-4 bg-yellow-200 align-middle mr-2 rounded-sm" />
            Unanswered annotation
          </p>
          <p className="mb-1">
            <span className="inline-block w-4 h-4 bg-green-200 align-middle mr-2 rounded-sm" />
            Agreed
          </p>
          <p>
            <span className="inline-block w-4 h-4 bg-red-200 align-middle mr-2 rounded-sm" />
            Disagreed
          </p>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoverTooltip.visible && (
        <div
          style={{
            position: "fixed",
            left: hoverTooltip.x + 12,
            top: hoverTooltip.y + 12,
            zIndex: 9999,
            pointerEvents: "none",
          }}
          className="bg-gray-900 text-white text-xs px-3 py-2 rounded shadow-lg max-w-xs"
        >
          <div className="font-semibold">{hoverTooltip.category}</div>
          <div>{hoverTooltip.subcategory}</div>
        </div>
      )}
    </div>
  );
}

/* -----------------------------
   Wrapper
------------------------------ */

export default function NewsAnnotationTool() {
  const [prolificId, setProlificId] = useState("");
  const [idSubmitted, setIdSubmitted] = useState(false);

  function submitProlificId(event) {
    event.preventDefault();
    if (!prolificId.trim()) return;
    setProlificId(prolificId.trim());
    setIdSubmitted(true);
  }

  // Loading and article assignment begin only after the ID is submitted.
  if (idSubmitted) {
    return <ToolMain prolificId={prolificId} />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={submitProlificId}
        className="w-full max-w-2xl bg-white rounded-xl shadow p-8"
      >
        <label
          htmlFor="prolific-id"
          className="mb-4 block text-2xl font-bold text-gray-900"
        >
          What is your Prolific ID?
        </label>
        <input
          id="prolific-id"
          name="prolificId"
          type="text"
          value={prolificId}
          onChange={(event) => setProlificId(event.target.value)}
          required
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby="prolific-id-help"
          className="w-full rounded-md border border-gray-300 bg-white p-3 text-gray-900"
        />
        <p id="prolific-id-help" className="mt-2 text-sm text-gray-600">
          Please copy and paste your Prolific ID to continue.
        </p>
        <div className="mt-6 text-center">
          <button
            type="submit"
            disabled={!prolificId.trim()}
            className={
              prolificId.trim()
                ? "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
                : "bg-gray-400 text-white px-6 py-2 rounded cursor-not-allowed"
            }
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
