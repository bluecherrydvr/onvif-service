export class EventQuery {
    static async queryEvents(params: {
        deviceId?: number,
        startTime?: number,
        endTime?: number,
        types?: string[],
        limit?: number
    }): Promise<any[]> {
        const where: any = {};
        
        if (params.deviceId) {
            where.device_id = params.deviceId;
        }

        if (params.types?.length) {
            where.type_id = { [Op.in]: params.types };
        }

        if (params.startTime || params.endTime) {
            where.time = {};
            if (params.startTime) {
                where.time[Op.gte] = params.startTime;
            }
            if (params.endTime) {
                where.time[Op.lte] = params.endTime;
            }
        }

        return Events.findAll({
            where,
            limit: params.limit || 100,
            order: [['time', 'DESC']]
        });
    }
}

