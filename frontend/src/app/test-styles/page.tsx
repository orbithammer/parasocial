export default function StyleTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🎉 Tailwind Test
        </h1>
        <p className="text-gray-600">
          If you can see a gradient background and styled card, Tailwind is working!
        </p>
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          Test Button
        </button>
      </div>
    </div>
  )
}