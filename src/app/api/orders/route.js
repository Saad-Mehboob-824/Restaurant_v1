export async function GET() {
  try {
    const { getOrCreateDefaultRestaurant } = await import('../../../utils/getRestaurantId')
    const { getOrders, connectToDB } = await import('../../../services/db')
    
    const restaurantId = await getOrCreateDefaultRestaurant()
    if (!restaurantId) {
      return Response.json({ error: 'No restaurant found. Please create a restaurant first.' }, { status: 404 })
    }
    
    await connectToDB()
    const orders = await getOrders(restaurantId)
    
    return Response.json(orders)
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    return Response.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const { getOrCreateDefaultRestaurant } = await import('../../../utils/getRestaurantId')
    const { updateOrderStatus, connectToDB } = await import('../../../services/db')
    
    const { orderId, status } = await request.json()
    if (!orderId || !status) {
      return Response.json(
        { error: 'Missing orderId or status' },
        { status: 400 }
      )
    }

    const restaurantId = await getOrCreateDefaultRestaurant()
    if (!restaurantId) {
      return Response.json({ error: 'No restaurant found. Please create a restaurant first.' }, { status: 404 })
    }
    
    await connectToDB()
    const updatedOrder = await updateOrderStatus(restaurantId, orderId, status)
    
    // Notify connected WebSocket clients via internal server endpoint
    try {
      const broadcastUrl = process.env.WS_BROADCAST_URL || 'http://localhost:3002/internal/ws/broadcast'
      await fetch(broadcastUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order:status-changed',
          orderId,
          status,
          order: updatedOrder,
          timestamp: Date.now()
        })
      })
    } catch (e) {
      console.error('Failed to notify WS clients:', e)
    }
    
    return Response.json(updatedOrder);
  } catch (error) {
    console.error('Failed to update order:', error);
    return Response.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { getOrCreateDefaultRestaurant } = await import('../../../utils/getRestaurantId')
    const { createOrder, connectToDB } = await import('../../../services/db')
    const { verify } = await import('jsonwebtoken')
    
    const body = await req.json()
    console.log('Received order request:', body)

    const restaurantId = await getOrCreateDefaultRestaurant()
    if (!restaurantId) {
      return Response.json({ error: 'No restaurant found. Please create a restaurant first.' }, { status: 404 })
    }

    // Ensure DB connection is established
    await connectToDB()

    // Extract userId from JWT token in cookie
    let userId = null
    try {
      const tokenCookie = req.cookies?.get('token')?.value
      if (tokenCookie) {
        const decoded = verify(tokenCookie, process.env.JWT_SECRET)
        userId = decoded.userId || null
        console.log('Extracted userId from token:', userId)
      }
    } catch (tokenError) {
      // Token verification failed - this is optional for order creation
      // Orders can still be created without userId (for non-POS orders)
      console.log('Token verification failed or no token:', tokenError.message)
    }

    // Delegate order creation to service
    // Items should now have menuItemId (ObjectId) instead of menuItem (string name)
    const orderType = (body.orderType || body.type || 'delivery')
    const orderPayload = {
      // Customer object will be built in createOrder from these fields
      name: body.customerName || body.name || body.customer?.name || '',
      phone: body.phone || body.customer?.phone || '',
      email: body.email || body.customer?.email || '',
      address: body.address || body.customer?.address || '',
      customer: body.customer || undefined, // Support direct customer object
      type: orderType,
      branch: orderType === 'pickup' ? (body.branch || '') : '', // Location key for pickup orders
      userId: userId, // Pass userId to order creation
      items: (body.items || []).map(item => ({
        menuItemId: item.menuItemId || item._id, // Use menuItemId (ObjectId) - required
        name: item.name || '', // Denormalized name for reference
        quantity: item.quantity || 1,
        variant: item.variant || '', // Variant name if applicable
        price: item.price || 0,
        selectedSides: Array.isArray(item.selectedSides) ? item.selectedSides : []
      })),
      total: body.totalAmount || body.total || 0,
      status: body.status || 'pending',
      instructions: body.instructions || ''
    }
    
    console.log('Mapped order payload:', JSON.stringify(orderPayload, null, 2))
    console.log('Branch value from request:', body.branch, 'Order type:', orderType)

    const order = await createOrder(restaurantId, orderPayload)

    // Notify all WebSocket clients about the new order via internal endpoint
    try {
      const broadcastUrl = process.env.WS_BROADCAST_URL || 'http://localhost:3002/internal/ws/broadcast'
      await fetch(broadcastUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order:added',
          orderId: order._id,
          order: order,
          timestamp: Date.now()
        })
      })
    } catch (e) {
      console.error('Failed to notify WS clients about new order:', e)
    }

    // Return full created order so client can confirm fields (including type)
    return Response.json(order);
  } catch (error) {
    console.error('Order creation error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}