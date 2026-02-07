import {NextRequest, NextResponse} from 'next/server'
import {handleAI, savePromptHistory} from '../../lib/ai'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const {update_id, message, callback_query} = body

  if (message) {
    const {message_id, chat, from: fromUser, date, text} = message

    if (fromUser) {
      const {
        id: fromId,
        is_bot,
        first_name,
        last_name,
        username,
        language_code,
      } = fromUser

      if (chat) {
        const {
          id: chatId,
          chatFirstName: first_name,
          chatLastName: last_name,
          chatUsername: username,
          chatType: type,
        } = chat

        /*
      if (callback_query) {
        const {chat_id, text} = callback_query
      }
        */

        // Send typing action while processing
        await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendChatAction`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({chat_id: chatId, action: 'typing'}),
          },
        )
        const aiResponse = await handleAI(text)
        /*
        const aiResponse = await getAvailabilityFromReference(
          'earliest available',
          'Intake',
          undefined,
          undefined,
          true,
        )
          */

        await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({chat_id: chatId, text: aiResponse}),
          },
        )
//        await savePromptHistory(fromId, 'tg', text, aiResponse)
        return NextResponse.json({success: true}, {status: 200})
      } else {
        return NextResponse.json({error: 'No from User found'}, {status: 400})
      }
    } else {
      return NextResponse.json({error: 'No chat found'}, {status: 400})
    }
  } else {
    return NextResponse.json({error: 'No message found'}, {status: 400})
  }
}
