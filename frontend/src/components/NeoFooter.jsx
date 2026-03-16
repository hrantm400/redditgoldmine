const NeoFooter = () => (
  <footer className="bg-neo-black text-white border-t-8 border-neo-accent py-12 mt-24">
    <div className="container mx-auto px-6 text-center">
      <div className="text-5xl font-heavy text-neo-accent mb-4">
        RedditGoldmine
      </div>
      <p className="font-mono text-gray-400 mb-6">
        &copy; <span id="current-year">{new Date().getFullYear()}</span> RedditGoldmine. All rights reserved.
      </p>
      <a
        href="https://t.me/+pM1AwiZDA9k3NDI6"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 bg-neo-main text-white border-4 border-neo-black px-6 py-3 font-bold text-lg hover:bg-neo-accent hover:text-neo-black transition-colors shadow-neo"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.559z" />
        </svg>
        Join Us
      </a>
    </div>
  </footer>
);

export default NeoFooter;

