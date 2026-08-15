const TOKEN_KEY = 'bookcocoon_token'
const USER_INFO_KEY = 'bookcocoon_user_info'
const REMEMBER_ACCOUNT_KEY = 'bookcocoon_remember_account'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUserInfo() {
  const raw = localStorage.getItem(USER_INFO_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(USER_INFO_KEY)
    return null
  }
}

// 登出时清除 token 与用户信息，但保留「记住我」的账号，便于下次登录回填。
export function clearLoginInfo() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_INFO_KEY)
}

export function getRememberedAccount() {
  return localStorage.getItem(REMEMBER_ACCOUNT_KEY)
}

export function rememberAccount(account) {
  localStorage.setItem(REMEMBER_ACCOUNT_KEY, account)
}

export function clearRememberedAccount() {
  localStorage.removeItem(REMEMBER_ACCOUNT_KEY)
}

// 登录：POST /api/user/login
// 请求体：{ account, password }（account 可为用户 ID、用户名或邮箱）
// 成功响应（无 code/data 包裹）：{ token, user_info: {...} }
export async function login({ account, password }) {
  let response

  try {
    response = await fetch('/api/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, password }),
    })
  } catch {
    throw new Error('网络错误，请稍后重试')
  }

  if (response.status === 401) {
    throw new Error('账号或密码错误，请重新输入')
  }

  if (!response.ok) {
    let message = `登录失败（${response.status}）`

    try {
      const text = (await response.text()).trim()
      if (text) {
        message = text
      }
    } catch {
      // 读取错误信息失败时使用默认文案
    }

    throw new Error(message)
  }

  const data = await response.json()
  const token = data?.token

  if (!token) {
    throw new Error('登录成功但未返回 token')
  }

  localStorage.setItem(TOKEN_KEY, token)

  if (data?.user_info) {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user_info))
  }

  return { token, user_info: data.user_info ?? null }
}
