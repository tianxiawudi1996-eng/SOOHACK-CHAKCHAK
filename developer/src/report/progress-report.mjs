export function buildProgressReport({attempts = [], reviews = []}) {
  const answered = attempts.length;
  const correct = attempts.filter((item) => item.outcome === 'CORRECT').length;
  const recalled = reviews.filter((item) => item.outcome === 'RECALLED').length;
  const difficultTopics = [...new Set(attempts.filter((item) => item.outcome === 'INCORRECT').map((item) => item.topicId).filter(Boolean))];
  return {
    answered,
    accuracy: answered ? correct / answered : null,
    reviewRecall: reviews.length ? recalled / reviews.length : null,
    difficultTopics,
    dataSufficient: answered >= 3
  };
}
