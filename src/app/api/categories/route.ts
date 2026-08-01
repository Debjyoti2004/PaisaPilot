export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: { children: true },
      where: { parentId: null },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Categories GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, kind, icon, color, parentId } = body
    if (!name || !kind) return NextResponse.json({ error: 'name and kind required' }, { status: 400 })

    const category = await prisma.category.create({
      data: { name, kind, icon: icon || '📦', color: color || '#6366f1', parentId: parentId || null },
    })
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Categories POST error:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, kind, icon, color } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const category = await prisma.category.update({
      where: { id },
      data: { ...(name && { name }), ...(kind && { kind }), ...(icon && { icon }), ...(color && { color }) },
    })
    return NextResponse.json({ category })
  } catch (error) {
    console.error('Categories PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Check if category has transactions
    const txCount = await prisma.transaction.count({ where: { categoryId: id } })
    if (txCount > 0) {
      return NextResponse.json({ error: `Cannot delete: ${txCount} transaction(s) use this category` }, { status: 409 })
    }

    // Delete subcategories first
    await prisma.category.deleteMany({ where: { parentId: id } })
    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Categories DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}

// PUT /api/categories — seed income categories for existing users
export async function PUT() {
  try {
    const INCOME_DEFS = [
      { name: 'Salary',        icon: '💼', color: '#22c55e' },
      { name: 'Freelancing',   icon: '💻', color: '#10b981' },
      { name: 'Bonus',         icon: '🎁', color: '#16a34a' },
      { name: 'Gift',          icon: '🎀', color: '#84cc16' },
      { name: 'Part-time',     icon: '⏰', color: '#14b8a6' },
      { name: 'Rental Income', icon: '🏠', color: '#0891b2' },
      { name: 'Interest',      icon: '📊', color: '#6366f1' },
      { name: 'Dividends',     icon: '📈', color: '#8b5cf6' },
      { name: 'Other Income',  icon: '💰', color: '#6b7280' },
    ]
    const results: string[] = []
    for (const d of INCOME_DEFS) {
      await prisma.category.upsert({
        where: { name: d.name },
        update: {},
        create: { name: d.name, kind: 'income', icon: d.icon, color: d.color },
      })
      results.push(d.name)
    }
    return NextResponse.json({ seeded: results })
  } catch (error) {
    console.error('Categories seed error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
