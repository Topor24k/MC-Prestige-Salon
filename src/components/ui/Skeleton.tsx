/** Placeholder shown while a page loads: the same rhythm as the page itself, shimmering slowly. */
export default function PageSkeleton() {
  return (
    <>
      <div aria-hidden="true">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--line" />
      </div>
      <div className="stats stats--three" aria-hidden="true">
        <div className="skeleton skeleton--stat" />
        <div className="skeleton skeleton--stat" />
        <div className="skeleton skeleton--stat" />
      </div>
      <div className="skeleton skeleton--panel" aria-hidden="true" />
      <span className="sr-only" role="status">
        Loading
      </span>
    </>
  );
}
