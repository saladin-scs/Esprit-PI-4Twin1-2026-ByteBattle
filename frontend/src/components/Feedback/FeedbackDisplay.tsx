import { FeedbackResponse } from '../../types/feedback';

interface FeedbackDisplayProps {
  feedback: FeedbackResponse;
}

function FeedbackDisplay({ feedback }: FeedbackDisplayProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'text-red-400 border-red-400';
      case 'medium':
        return 'text-yellow-400 border-yellow-400';
      case 'low':
        return 'text-blue-400 border-blue-400';
      case 'info':
        return 'text-green-400 border-green-400';
      default:
        return 'text-gray-400 border-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'strength':
        return '✓';
      case 'improvement':
        return '⚠';
      case 'hint':
        return '💡';
      default:
        return '•';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      {/* Score Header */}
      <div className="flex items-center justify-between border-b border-gray-700 pb-4">
        <h3 className="text-xl font-semibold text-white">AI Code Analysis</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Score:</span>
          <span className={`text-2xl font-bold ${getScoreColor(feedback.overall_score)}`}>
            {feedback.overall_score}/100
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-900 rounded-lg p-4">
        <p className="text-gray-300 leading-relaxed">{feedback.summary}</p>
      </div>

      {/* Feedback Points */}
      {feedback.points && feedback.points.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-white">Feedback Points</h4>
          {feedback.points.map((point, index) => (
            <div
              key={index}
              className={`border-l-4 rounded-r-lg p-4 bg-gray-900 ${getSeverityColor(point.severity)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{getCategoryIcon(point.category)}</span>
                <div className="flex-1">
                  <h5 className="font-semibold text-white mb-1">{point.title}</h5>
                  <p className="text-gray-300 text-sm leading-relaxed">{point.description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 capitalize">
                      {point.category}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 capitalize">
                      {point.severity}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FeedbackDisplay;

