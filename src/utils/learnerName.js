const KEY = 'lbf_learner_name'

export function getLearnerName() {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

export function setLearnerName(name) {
  try {
    if (name) localStorage.setItem(KEY, name)
  } catch {
    /* storage unavailable */
  }
}