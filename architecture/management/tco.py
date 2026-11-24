"""Illustrative monthly AI generation economics; no market quotes or production capacity.
Standard library only. All quantities are hypothetical planning inputs in RUB.
"""
from dataclasses import dataclass
from decimal import Decimal as D, ROUND_CEILING
import argparse


@dataclass(frozen=True)
class Assumptions:
    hourly_engineering: D = D("2500")
    local_worker_month: D = D("16000")
    local_worker_capacity: int = 60000  # admitted requests/month, unmeasured
    local_fixed_hours: D = D("12")
    local_extra_worker_hours: D = D("2")
    local_variable: D = D("0.12")
    managed_fixed: D = D("3000")
    managed_hours: D = D("4")
    input_tokens: int = 2000
    output_tokens: int = 250
    input_per_million: D = D("300")
    output_per_million: D = D("900")
    managed_overhead: D = D("0.05")
    hybrid_governance_hours: D = D("4")

    @property
    def managed_variable(self):
        return (D(self.input_tokens)*self.input_per_million +
                D(self.output_tokens)*self.output_per_million)/D(1_000_000) + self.managed_overhead


def local(n, a):
    if not n:
        return D(0), 0
    workers = int((D(n)/D(a.local_worker_capacity)).to_integral_value(rounding=ROUND_CEILING))
    return (workers*a.local_worker_month + a.hourly_engineering *
            (a.local_fixed_hours + (workers-1)*a.local_extra_worker_hours) + n*a.local_variable), workers


def managed(n, a):
    return (a.managed_fixed + a.managed_hours*a.hourly_engineering +
            n*a.managed_variable) if n else D(0)


def compare(n, private_fraction, a=Assumptions()):
    if type(n) is not int or n < 1 or not D(0) <= private_fraction <= D(1) or a.local_worker_capacity < 1:
        raise ValueError("positive integer requests, private fraction in [0,1], positive capacity")
    private = int((n*private_fraction).to_integral_value(rounding=ROUND_CEILING))
    public = n-private
    local_cost, workers = local(n, a)
    private_cost, private_workers = local(private, a)
    hybrid = private_cost + managed(public, a)
    if private and public:
        hybrid += a.hybrid_governance_hours*a.hourly_engineering
    return {"requests":n, "local":local_cost, "local_workers":workers,
            "managed":managed(n,a) if not private else None,
            "managed_counterfactual":managed(n,a), "hybrid":hybrid,
            "hybrid_workers":private_workers, "private_requests":private}


def single_worker_break_even(a=Assumptions()):
    fixed_difference = a.local_worker_month + a.local_fixed_hours*a.hourly_engineering - (
        a.managed_fixed + a.managed_hours*a.hourly_engineering)
    marginal_difference = a.managed_variable-a.local_variable
    if marginal_difference <= 0 or fixed_difference < 0:
        return None
    n = int((fixed_difference/marginal_difference).to_integral_value(rounding=ROUND_CEILING))
    return n if 1 <= n <= a.local_worker_capacity else None


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--private-fraction", type=D, default=D("0.2"))
    args=p.parse_args()
    a=Assumptions()
    print("ILLUSTRATIVE RUB/month; prices and capacity are assumptions, NOT quotes or measurements")
    print("managed variable:", a.managed_variable, "single-worker crossover:",single_worker_break_even(a))
    for n in (1000,10000,50000,100000):
        print(compare(n,args.private_fraction,a))


if __name__=="__main__":
    main()
