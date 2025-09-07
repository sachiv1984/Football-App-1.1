<div
  className={`flex flex-col justify-between h-full ${
    isActive ? 'transform scale-105 transition-transform duration-300' : ''
  }`}
>
  {/* Top row: Competition logo left, Game Week right */}
  <div className="flex items-center justify-between mb-4 px-2">
    {fixture.competition.logo ? (
      <img
        src={fixture.competition.logo}
        alt={fixture.competition.name}
        className="w-12 h-12 object-contain"
        draggable={false}
      />
    ) : (
      <div className="w-12 h-12" />
    )}
    <span className="text-xs text-gray-500">Week {fixture.matchWeek || 1}</span>
  </div>

  {/* Middle row: Teams & Time */}
  <div className="flex items-center justify-center mb-4 space-x-4">
    {/* Home Team */}
    <div className="flex flex-col items-center">
      {fixture.homeTeam.logo ? (
        <img
          src={fixture.homeTeam.logo}
          alt={fixture.homeTeam.name}
          className="w-16 h-16 object-contain"
        />
      ) : (
        <span>{fixture.homeTeam.name[0]}</span>
      )}
      <span className="text-xs truncate mt-1">{fixture.homeTeam.shortName || fixture.homeTeam.name}</span>
    </div>

    {/* Match Time */}
    <div className="flex flex-col items-center text-center">
      <span className="text-gray-700 font-medium text-base">
        {new Date(fixture.dateTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}
      </span>
      <span className="text-xs text-gray-500">
        {new Date(fixture.dateTime).toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}
      </span>
    </div>

    {/* Away Team */}
    <div className="flex flex-col items-center">
      {fixture.awayTeam.logo ? (
        <img
          src={fixture.awayTeam.logo}
          alt={fixture.awayTeam.name}
          className="w-16 h-16 object-contain"
        />
      ) : (
        <span>{fixture.awayTeam.name[0]}</span>
      )}
      <span className="text-xs truncate mt-1">{fixture.awayTeam.shortName || fixture.awayTeam.name}</span>
    </div>
  </div>

  {/* Bottom row: Venue & Featured badge */}
  <div className="flex flex-col items-center">
    <div className="text-xs text-gray-500 truncate">{fixture.venue}</div>
    {fixture.importance >= 80 && (
      <span className="mt-2 inline-block bg-yellow-400 text-gray-900 px-2 py-1 rounded-full text-[10px] sm:text-[12px]">
        Featured
      </span>
    )}
  </div>
</div>
