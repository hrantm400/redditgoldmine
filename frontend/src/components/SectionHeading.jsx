const SectionHeading = ({ eyebrow, title, description }) => (
  <div className="text-center max-w-3xl mx-auto space-y-4 g-fade-in">
    {eyebrow && (
      <p className="text-xs font-heavy uppercase tracking-[0.4em] text-neo-main">{eyebrow}</p>
    )}
    <h2 className="text-4xl md:text-6xl font-display font-extrabold text-neo-black">{title}</h2>
    {description && <p className="text-lg text-gray-700">{description}</p>}
  </div>
);

export default SectionHeading;










