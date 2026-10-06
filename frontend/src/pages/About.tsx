export default function About() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-4">
      <div className="rounded-2xl bg-white border shadow-sm p-6 text-gray-700">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 mb-4">About</h1>
        <p className="leading-relaxed">
          An application that can grade problem solutions that are symbolic in nature, combining quiz delivery with AI-powered grading.
        </p>
      </div>
      <div className="rounded-2xl bg-white border shadow-sm p-6 text-gray-700">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 mb-4">Contact</h2>
        <div className="leading-relaxed space-y-1">
          <p>CS 4910 Spring Group 6</p>
          <p>Dr. Dean Johnson: dean.johnson@wmich.edu</p>
        </div>
      </div>
    </main>
  );
}
