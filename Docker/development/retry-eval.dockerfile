FROM poet-base

COPY ["./node/config/retry-eval.json", "/etc/poet/retry-eval.json"]

VOLUME /poet/src
VOLUME /poet/dist

EXPOSE 5856

CMD [ "npm", "run", "retry-eval-debug", "--", "-c", "/etc/poet/retry-eval.json" ]
