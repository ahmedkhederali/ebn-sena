import { AppointmentModel } from '../appointments/appointments.schema'
import { UserModel } from '../auth/auth.schema'
import { PaymentModel } from '../payments/payments.service'

export async function getSummary(from: Date, to: Date) {
  const dateFilter = { appointmentDateTime: { $gte: from, $lte: to } }

  const [apptStats, newPatients] = await Promise.all([
    AppointmentModel.aggregate<{
      _id: null
      totalAppointments: number
      completedAppointments: number
      cancelledAppointments: number
    }>([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          cancelledAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
    ]),
    UserModel.countDocuments({
      role: 'patient',
      createdAt: { $gte: from, $lte: to },
    }),
  ])

  const revenue = await PaymentModel.aggregate<{ _id: null; total: number }>([
    {
      $match: {
        status: 'succeeded',
        createdAt: { $gte: from, $lte: to },
      },
    },
    { $group: { _id: null, total: { $sum: '$amountSAR' } } },
  ])

  const stats = apptStats[0]

  return {
    totalAppointments: stats?.totalAppointments ?? 0,
    totalRevenueSAR: revenue[0]?.total ?? 0,
    newPatients,
    completedAppointments: stats?.completedAppointments ?? 0,
    cancelledAppointments: stats?.cancelledAppointments ?? 0,
  }
}

export async function getByDay(from: Date, to: Date) {
  const results = await AppointmentModel.aggregate<{
    _id: { year: number; month: number; day: number }
    appointments: number
  }>([
    { $match: { appointmentDateTime: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: {
          year: { $year: '$appointmentDateTime' },
          month: { $month: '$appointmentDateTime' },
          day: { $dayOfMonth: '$appointmentDateTime' },
        },
        appointments: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ])

  // Fill in zero-count days
  const dataMap = new Map<string, number>()
  for (const r of results) {
    const dateKey = `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`
    dataMap.set(dateKey, r.appointments)
  }

  const days: { date: string; appointments: number; revenue: number }[] = []
  const cursor = new Date(from)
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= to) {
    const key = cursor.toISOString().slice(0, 10)
    days.push({ date: key, appointments: dataMap.get(key) ?? 0, revenue: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export async function getBySpecialty(from: Date, to: Date) {
  const results = await AppointmentModel.aggregate<{
    _id: string
    nameAr: string
    nameEn: string
    appointments: number
  }>([
    {
      $match: {
        appointmentDateTime: { $gte: from, $lte: to },
        status: { $in: ['confirmed', 'completed'] },
      },
    },
    {
      $lookup: {
        from: 'doctorprofiles',
        localField: 'doctorId',
        foreignField: 'userId',
        as: 'doctorProfile',
      },
    },
    { $unwind: { path: '$doctorProfile', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'services',
        localField: 'doctorProfile.specialtyId',
        foreignField: '_id',
        as: 'specialty',
      },
    },
    { $unwind: { path: '$specialty', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$specialty._id',
        nameAr: { $first: '$specialty.nameAr' },
        nameEn: { $first: '$specialty.nameEn' },
        appointments: { $sum: 1 },
      },
    },
    { $sort: { appointments: -1 } },
  ])

  return results.map((r) => ({
    specialtyId: r._id?.toString() ?? 'unknown',
    nameAr: r.nameAr ?? 'غير محدد',
    nameEn: r.nameEn ?? 'Unknown',
    appointments: r.appointments,
    revenue: 0,
  }))
}
