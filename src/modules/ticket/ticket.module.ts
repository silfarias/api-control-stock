import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity.js';
import { TicketMapper } from './mappers/ticket.mapper.js';
import { TicketBodyMiddleware } from './ticket.middleware.js';
import { TicketController } from './ticket.controller.js';
import { TicketService } from './ticket.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket])],
  controllers: [TicketController],
  providers: [TicketService, TicketMapper, TicketBodyMiddleware],
  exports: [TicketService],
})
export class TicketModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TicketBodyMiddleware).forRoutes({
      path: 'ticket',
      method: RequestMethod.PATCH,
    });
  }
}
