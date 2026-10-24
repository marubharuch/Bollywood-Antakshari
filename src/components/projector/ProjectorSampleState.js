/** Static sample data for projector test screen — does not touch game store. */
export function createProjectorTestGameState() {
  return {
    stage: 'Grand Finale Night',
    round: 2,
    roundLabel: 'Bollywood Classics',
    demoActive: false,
    tournament: {
      status: 'in_progress',
      name: 'Sample Tournament',
      plannedRounds: [],
    },
    playSession: {
      anchorStep: 'question_live',
      playPhase: 'live',
      questionIndex: 2,
      questions: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
      assignedTeamId: 'team-a',
      manualTeamPick: false,
    },
    teams: [
      { id: 'team-a', name: 'Mumbai Melodies', score: 120, accent: '#f59e0b' },
      { id: 'team-b', name: 'Delhi Divas', score: 95, accent: '#ec4899' },
      { id: 'team-c', name: 'Chennai Chorus', score: 88, accent: '#38bdf8' },
      { id: 'team-d', name: 'Kolkata Kirtan', score: 76, accent: '#a78bfa' },
    ],
    question: {
      prompt: 'Name a song starting with this letter',
      letter: 'M',
      hiddenAnswer: 'Mitwa',
      answerRevealed: false,
    },
    playTimer: {
      projectorVisible: true,
      remainingSeconds: 38,
      running: true,
      locked: false,
    },
    scoreDisplay: { projectorOn: true, mode: 'all' },
    buzzer: { status: 'ready' },
    buzzerSystem: { enabled: false },
    mediaPlayback: null,
    presentation: {},
    scorePresentation: null,
    scoreAnnouncement: null,
  }
}
