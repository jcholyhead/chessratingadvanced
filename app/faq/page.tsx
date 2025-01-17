export default function FAQPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Frequently Asked Questions</h1>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">What is the Chess Ratings Dashboard?</h2>
          <p>The Chess Ratings Dashboard is a free tool that provides enhanced analytics and visualisations based on English Chess Federation (ECF) rating data. It allows players to view their rating history, analyse their performance, and compare their results with other players.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Who built this site?</h2>
          <p>My name is James Holyhead, I&apos;m a club player and software engineer based in Shropshire. We might have met, or even played each other at a Congress - now you can easily find out! You can contact me at <a className="text-blue-500" href="mailto:chessratinganalytics@gmail.com">chessRatingAnalytics@gmail.com</a></p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">You do know about ecfrating.org.uk, right?</h2>
          <p>This site is not intended as a replacement for the official ECF site - in fact it relies on the official ratings API for all of the data being displayed, and almost all of the credit for this site belongs to the team of volunteers who built the ECF rating system.</p><br />
          <p>This site was motivated by some of the analysis and visualisations I created in spreadsheets using the ratings API and I thought that this was a tool other players might find useful or interesting. Let me know by email at <a className="text-blue-500" href="mailto:chessratinganalytics@gmail.com">chessRatingAnalytics@gmail.com</a>.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">How often are the ratings updated?</h2>
          <p>The ratings are updated directly from the ECF database, and includes all game results as soon as they have been submitted for rating. This makes it as close to a &quot;live rating&quot; monitor as possible.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Can I view ratings for players from other federations?</h2>
          <p>Currently, our dashboard only supports ECF ratings. We may expand to include other federations in the future.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">How do I interpret the rating graph?</h2>
          <p>The rating graph shows a player&apos;s rating changes over time. Each point represents a rated game, with the y-axis showing the rating and the x-axis showing the date.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">What do the different game types mean?</h2>
          <p>The ECF provides ratings for three main game types: Standard (classical chess), Rapid, and Blitz. Each has different time controls and may reflect different aspects of a player&apos;s skill.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Can I view all of my ratings for different time controls on one rating graph?</h2>
          <p>We haven&apos;t implemented that ability yet, but it&apos;s something we might get round to adding eventually.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">How can I support the site</h2>
          <p><a className="text-blue-500" href="ko-fi.com/chessratinganalytics">Any donation</a> to the upkeep of the site would be greatly appreciated and would guarantee the site&apos;s existence long term. It would also help drive me to finish some more cool features.</p>
        </div>
      </div>
    </div>
  )
}

